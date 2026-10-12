// Package invites implements Invites and signing up from one (Card 1).
package invites

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/auth"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/email"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// inviteTTL is how long an Invite link works after it was last sent (Card 1 rule 3).
const inviteTTL = 7 * 24 * time.Hour

// Status is where an Invite stands (see Invite in GLOSSARY.md).
type Status string

// The Invite statuses. Expired is worked out from the expiry date; the others are stored.
const (
	StatusPending   Status = "pending"
	StatusAccepted  Status = "accepted"
	StatusExpired   Status = "expired"
	StatusCancelled Status = "cancelled"
)

var (
	// ErrNoLongerValid means an Invite link is expired, used, cancelled or unknown (Card 1, "no longer valid").
	ErrNoLongerValid = errors.New("invite is no longer valid")
	// ErrNotFound means no Invite has that id.
	ErrNotFound = errors.New("invite not found")
	// ErrNotOpen means the Invite was accepted or cancelled, so it cannot be resent or cancelled.
	ErrNotOpen = errors.New("invite was accepted or cancelled")
)

// Invite is an Invite as the Members page shows it.
type Invite struct {
	ID        uuid.UUID
	Email     string
	Role      users.Role
	Status    Status
	InvitedBy uuid.UUID
	ExpiresAt time.Time
	CreatedAt time.Time
}

// SentInvite is an Invite just sent or resent: its link, which exists only now (only its hash is stored), and
// whether the email went out. When it did not, the Admin copies the link by hand (Card 1 edge case).
type SentInvite struct {
	Invite
	Link      string
	EmailSent bool
}

// NewInvite is what the Admin sends. An empty Role means Member (Card 1 inputs).
type NewInvite struct {
	Email string
	Role  users.Role
}

// SignUp is what the invitee enters (Card 1 inputs).
type SignUp struct {
	DisplayName string
	Password    string
}

// sessionStarter starts the new User's Session; auth.Service is the real one.
type sessionStarter interface {
	StartSession(ctx context.Context, user users.User) (auth.IssuedSession, error)
}

// Service holds the Card 1 rules.
type Service struct {
	pool     *pgxpool.Pool
	queries  *Queries
	users    *users.Service
	sessions sessionStarter
	sender   email.Sender
	links    email.Links
	now      func() time.Time
}

// NewService returns a Service. now is time.Now in production and a hand-moved clock in tests.
func NewService(pool *pgxpool.Pool, userService *users.Service, sessions sessionStarter, sender email.Sender, links email.Links, now func() time.Time) *Service {
	return &Service{pool: pool, queries: New(pool), users: userService, sessions: sessions, sender: sender, links: links, now: now}
}

// Send invites an email address (Card 1 rules 1 to 3). A Pending or Expired Invite to the same email is cancelled
// first, so only the newest link works. The Invite is saved before the email is sent, so a failed send keeps it.
func (s *Service) Send(ctx context.Context, actor users.User, newInvite NewInvite) (SentInvite, error) {
	if !users.CanManageUsers(actor) {
		return SentInvite{}, users.ErrForbidden
	}
	newInvite, err := s.validate(ctx, newInvite)
	if err != nil {
		return SentInvite{}, err
	}
	token, tokenHash, err := platformauth.NewOpaqueToken()
	if err != nil {
		return SentInvite{}, err
	}
	id, err := uuid.NewV7()
	if err != nil {
		return SentInvite{}, fmt.Errorf("new invite id: %w", err)
	}
	now := s.now()
	created, err := s.replaceOpenInvite(ctx, CreateInviteParams{
		ID: id, Email: newInvite.Email, Role: userRole(newInvite.Role), TokenHash: tokenHash,
		InvitedBy: actor.ID, ExpiresAt: now.Add(inviteTTL), CreatedAt: now,
	})
	if err != nil {
		return SentInvite{}, err
	}
	return s.deliver(ctx, actor, created, token), nil
}

// replaceOpenInvite cancels the email's open Invite and creates the new one, in one transaction that first takes
// the email's lock, so concurrent Sends to one email run one after the other and the newest wins.
func (s *Service) replaceOpenInvite(ctx context.Context, params CreateInviteParams) (inviteRow, error) {
	var created inviteRow
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		queries := s.queries.WithTx(tx)
		if err := queries.LockInviteEmail(ctx, params.Email); err != nil {
			return fmt.Errorf("lock invite email: %w", err)
		}
		if err := queries.CancelOpenInviteForEmail(ctx, CancelOpenInviteForEmailParams{Email: params.Email, CancelledAt: &params.CreatedAt}); err != nil {
			return fmt.Errorf("cancel open invite: %w", err)
		}
		var err error
		created, err = queries.CreateInvite(ctx, params)
		if err != nil {
			return fmt.Errorf("create invite: %w", err)
		}
		return nil
	})
	return created, err
}

// validate checks the email and Role, and that the email has no User (Card 1 rule 2). A deactivated User is
// reactivated from the Members page instead (Card 1, clarified 2026-10-11).
func (s *Service) validate(ctx context.Context, newInvite NewInvite) (NewInvite, error) {
	newInvite.Email = strings.TrimSpace(newInvite.Email)
	if newInvite.Role == "" {
		newInvite.Role = users.RoleMember
	}
	var problems validation.Errors
	if address, err := mail.ParseAddress(newInvite.Email); err != nil || address.Address != newInvite.Email {
		problems.Add("email", "Enter a valid email address.")
	}
	if !newInvite.Role.Valid() {
		problems.Add("role", "Pick admin or member.")
	}
	if len(problems) > 0 {
		return newInvite, problems
	}
	existing, err := s.users.FindByEmail(ctx, newInvite.Email)
	switch {
	case errors.Is(err, users.ErrNotFound):
		return newInvite, nil
	case err != nil:
		return newInvite, fmt.Errorf("find user: %w", err)
	case existing.Active:
		return newInvite, validation.Errors{{Field: "email", Message: "This person already has an account."}}
	default:
		return newInvite, validation.Errors{{Field: "email", Message: "This person has a deactivated account. Reactivate them from Members."}}
	}
}

// Resend gives an open Invite a new link and a fresh 7 days, keeping its Role; the old link stops working (Card 1
// rule 4).
func (s *Service) Resend(ctx context.Context, actor users.User, id uuid.UUID) (SentInvite, error) {
	if !users.CanManageUsers(actor) {
		return SentInvite{}, users.ErrForbidden
	}
	token, tokenHash, err := platformauth.NewOpaqueToken()
	if err != nil {
		return SentInvite{}, err
	}
	now := s.now()
	renewed, err := s.queries.RenewInvite(ctx, RenewInviteParams{ID: id, TokenHash: tokenHash, ExpiresAt: now.Add(inviteTTL), UpdatedAt: now})
	if errors.Is(err, pgx.ErrNoRows) {
		return SentInvite{}, s.whyNotOpen(ctx, id)
	}
	if err != nil {
		return SentInvite{}, fmt.Errorf("renew invite: %w", err)
	}
	return s.deliver(ctx, actor, renewed, token), nil
}

// Cancel stops an open Invite's link from working.
func (s *Service) Cancel(ctx context.Context, actor users.User, id uuid.UUID) error {
	if !users.CanManageUsers(actor) {
		return users.ErrForbidden
	}
	now := s.now()
	cancelled, err := s.queries.CancelInvite(ctx, CancelInviteParams{ID: id, CancelledAt: &now})
	if err != nil {
		return fmt.Errorf("cancel invite: %w", err)
	}
	if cancelled == 0 {
		return s.whyNotOpen(ctx, id)
	}
	return nil
}

// whyNotOpen tells an unknown Invite apart from one that was accepted or cancelled.
func (s *Service) whyNotOpen(ctx context.Context, id uuid.UUID) error {
	_, err := s.queries.GetInvite(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("find invite: %w", err)
	}
	return ErrNotOpen
}

// List returns every Invite, newest first, for the Members page. Admins only.
func (s *Service) List(ctx context.Context, actor users.User) ([]Invite, error) {
	if !users.CanManageUsers(actor) {
		return nil, users.ErrForbidden
	}
	rows, err := s.queries.ListInvites(ctx)
	if err != nil {
		return nil, fmt.Errorf("list invites: %w", err)
	}
	now := s.now()
	listed := make([]Invite, len(rows))
	for i, row := range rows {
		listed[i] = toInvite(row, now)
	}
	return listed, nil
}

// Check returns the Pending Invite for token, so the sign-up page can show its email (Card 1 rule 5). An Invite
// whose email has an account by now is no longer valid either.
func (s *Service) Check(ctx context.Context, token string) (Invite, error) {
	row, err := s.queries.GetInviteByTokenHash(ctx, platformauth.HashOpaqueToken(token))
	if errors.Is(err, pgx.ErrNoRows) {
		return Invite{}, ErrNoLongerValid
	}
	if err != nil {
		return Invite{}, fmt.Errorf("find invite: %w", err)
	}
	invite := toInvite(row, s.now())
	if invite.Status != StatusPending {
		return Invite{}, ErrNoLongerValid
	}
	_, err = s.users.FindByEmail(ctx, invite.Email)
	switch {
	case err == nil:
		return Invite{}, ErrNoLongerValid
	case !errors.Is(err, users.ErrNotFound):
		return Invite{}, fmt.Errorf("find user: %w", err)
	}
	return invite, nil
}

// Accept creates the User from a Pending Invite, with its email and Role, and logs them in (Card 1 rules 5 and 6).
// Marking the Invite accepted and creating the User happen in one transaction, so a link works only once.
func (s *Service) Accept(ctx context.Context, token string, signUp SignUp) (auth.IssuedSession, error) {
	invite, err := s.Check(ctx, token)
	if err != nil {
		return auth.IssuedSession{}, err
	}
	now := s.now()
	var created users.User
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		accepted, err := s.queries.WithTx(tx).AcceptInvite(ctx, AcceptInviteParams{ID: invite.ID, AcceptedAt: &now})
		if err != nil {
			return fmt.Errorf("accept invite: %w", err)
		}
		if accepted == 0 {
			return ErrNoLongerValid
		}
		created, err = s.users.WithTx(tx).Create(ctx, users.NewUser{
			Email: invite.Email, Password: signUp.Password, DisplayName: signUp.DisplayName, Role: invite.Role,
		})
		if errors.Is(err, users.ErrEmailTaken) {
			return ErrNoLongerValid
		}
		return err
	})
	if err != nil {
		return auth.IssuedSession{}, err
	}
	return s.sessions.StartSession(ctx, created)
}

// deliver emails the Invite's link and reports the result. A failed send is logged without the address or link.
func (s *Service) deliver(ctx context.Context, actor users.User, row inviteRow, token string) SentInvite {
	link := s.links.To("/invite/"+url.PathEscape(token), nil)
	sent := SentInvite{Invite: toInvite(row, s.now()), Link: link}
	if err := s.sender.Send(ctx, inviteEmail(actor, row, link)); err != nil {
		log.Printf("invite: %v", err)
		return sent
	}
	sent.EmailSent = true
	return sent
}

func inviteEmail(actor users.User, row inviteRow, link string) email.Message {
	return email.Message{
		To:      row.Email,
		Subject: actor.DisplayName + " invited you to Mini Manager",
		Body: fmt.Sprintf("Hi,\n\n%s invited you to Mini Manager, your group's shared catalog of miniatures. "+
			"To create your account, open:\n\n%s\n\nThe link works once and expires on %s.\n",
			actor.DisplayName, link, row.ExpiresAt.UTC().Format("Monday 2 January 2006")),
	}
}

// toInvite works out the status: accepted and cancelled are stored; an open Invite past its expiry is Expired.
func toInvite(row inviteRow, now time.Time) Invite {
	status := StatusPending
	switch {
	case row.AcceptedAt != nil:
		status = StatusAccepted
	case row.CancelledAt != nil:
		status = StatusCancelled
	case !now.Before(row.ExpiresAt):
		status = StatusExpired
	}
	return Invite{
		ID: row.ID, Email: row.Email, Role: users.Role(row.Role), Status: status,
		InvitedBy: row.InvitedBy, ExpiresAt: row.ExpiresAt, CreatedAt: row.CreatedAt,
	}
}
