// Package auth implements login, token refresh, logout and Password reset (Card 2), and changing a password
// (Card 3 rules 2 and 3), because all of them start or end Sessions. Decisions on the gaps in Card 2 are in ADR 0002.
package auth

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/email"
)

// reuseGraceWindow is how long a rotated refresh token may be reused without ending its Session, so two tabs
// refreshing at the same moment do not log the User out (ADR 0002).
const reuseGraceWindow = 30 * time.Second

// RefreshTokenTTL is how long a refresh token lasts; each refresh starts a new 7 days (Card 2 rule 4, ADR 0002).
const RefreshTokenTTL = 7 * 24 * time.Hour

// Lockout settings (Card 2 rule 3): more than maxLoginFailures attempts within LockoutWindow are refused.
const (
	maxLoginFailures = 5
	LockoutWindow    = 15 * time.Minute
)

// ErrLocked means the email has too many recent failed logins (Card 2 rule 3). The error returned is a
// *LockedError, which says when to try again.
var ErrLocked = errors.New("too many failed logins")

// LockedError is a refused login with the time until the email unlocks.
type LockedError struct {
	RetryAfter time.Duration
}

func (e *LockedError) Error() string {
	return fmt.Sprintf("%v: retry after %v", ErrLocked, e.RetryAfter)
}
func (e *LockedError) Is(target error) bool { return target == ErrLocked }

// ErrInvalidRefreshToken means the refresh token is unknown, expired or revoked. The client must log in again.
var ErrInvalidRefreshToken = errors.New("invalid refresh token")

// ErrInvalidCredentials is the one login error for a wrong password, an unknown email and a deactivated User,
// so the answer never reveals which emails have accounts (Card 2 rule 2).
var ErrInvalidCredentials = errors.New("email or password is incorrect")

// Service holds the Card 2 rules.
type Service struct {
	pool         *pgxpool.Pool
	queries      *Queries
	users        *users.Service
	accessTokens *platformauth.AccessTokens
	sender       email.Sender
	links        email.Links
	now          func() time.Time
	// emails tracks reset emails still being sent after their request was answered.
	emails sync.WaitGroup
	// dummyPasswordHash is verified against for unknown emails, so they take as long as a wrong password.
	dummyPasswordHash string
}

// NewService returns a Service. sender and links send Password reset emails; now is time.Now in production and a
// hand-moved clock in tests.
func NewService(
	pool *pgxpool.Pool, userService *users.Service, accessTokens *platformauth.AccessTokens,
	sender email.Sender, links email.Links, now func() time.Time,
) (*Service, error) {
	dummyPasswordHash, err := platformauth.HashPassword("not a real password")
	if err != nil {
		return nil, fmt.Errorf("hash dummy password: %w", err)
	}
	return &Service{
		pool:              pool,
		queries:           New(pool),
		users:             userService,
		accessTokens:      accessTokens,
		sender:            sender,
		links:             links,
		now:               now,
		dummyPasswordHash: dummyPasswordHash,
	}, nil
}

// IssuedSession is what a login or refresh gives the client: a new access token and the Session's new refresh
// token.
type IssuedSession struct {
	AccessToken      string
	ExpiresIn        time.Duration
	RefreshToken     string
	RefreshExpiresAt time.Time
	User             users.User
}

// Login checks email and password and starts a new Session.
//
// Every attempt is recorded before anything is checked, and only a successful one clears the record. Parallel
// guesses therefore each see the others' rows and cannot slip past the lock, and refused attempts keep the email
// locked until 15 minutes after the latest ones (Card 2 rule 3, ADR 0002).
func (s *Service) Login(ctx context.Context, email, password string) (IssuedSession, error) {
	now := s.now()
	if err := s.recordLoginAttempt(ctx, email, now); err != nil {
		return IssuedSession{}, err
	}
	attempts, err := s.queries.CountLoginFailuresSince(ctx, CountLoginFailuresSinceParams{
		Email: email, FailedAt: lockoutWindowStart(now),
	})
	if err != nil {
		return IssuedSession{}, fmt.Errorf("count login attempts: %w", err)
	}
	// Checked before the password, so even the right password is refused while locked.
	if attempts > maxLoginFailures {
		return IssuedSession{}, s.lockedError(ctx, email, now)
	}

	user, ok, err := s.checkCredentials(ctx, email, password)
	if err != nil {
		return IssuedSession{}, err
	}
	if !ok {
		return IssuedSession{}, ErrInvalidCredentials
	}

	if err := s.queries.ClearLoginFailures(ctx, email); err != nil {
		return IssuedSession{}, fmt.Errorf("clear login failures: %w", err)
	}
	return s.StartSession(ctx, user)
}

// StartSession starts a new Session for user, as a login does. Accepting an Invite uses it to log the new User in
// (Card 1 rule 6); the caller has already checked who user is.
func (s *Service) StartSession(ctx context.Context, user users.User) (IssuedSession, error) {
	sessionID, err := uuid.NewV7()
	if err != nil {
		return IssuedSession{}, fmt.Errorf("new session id: %w", err)
	}
	issued, err := s.issue(ctx, s.queries, user, sessionID, s.now())
	if err != nil {
		return IssuedSession{}, err
	}
	return issued.IssuedSession, nil
}

// EndAllSessions revokes every Session of userID inside the caller's transaction tx, for example in the same
// transaction that deactivates them (Card 4, clarified 2026-10-11). Access tokens already issued stop working at
// once too, because every request reloads the User.
func (s *Service) EndAllSessions(ctx context.Context, tx pgx.Tx, userID uuid.UUID) error {
	now := s.now()
	if err := s.queries.WithTx(tx).RevokeUserSessions(ctx, RevokeUserSessionsParams{UserID: userID, RevokedAt: &now}); err != nil {
		return fmt.Errorf("revoke sessions: %w", err)
	}
	return nil
}

// checkCredentials reports whether email and password belong to an active User. Unknown emails do the same argon2
// work as known ones, so response time does not reveal them either.
func (s *Service) checkCredentials(ctx context.Context, email, password string) (users.User, bool, error) {
	// No real password is longer, and refusing early keeps a huge one from tying up argon2.
	if utf8.RuneCountInString(password) > users.MaxPasswordCharacters {
		return users.User{}, false, nil
	}
	record, err := s.users.FindLoginRecord(ctx, email)
	if errors.Is(err, users.ErrNotFound) {
		if _, err := platformauth.VerifyPassword(password, s.dummyPasswordHash); err != nil {
			return users.User{}, false, fmt.Errorf("verify dummy password: %w", err)
		}
		return users.User{}, false, nil
	}
	if err != nil {
		return users.User{}, false, fmt.Errorf("find user: %w", err)
	}
	matches, err := platformauth.VerifyPassword(password, record.PasswordHash)
	if err != nil {
		return users.User{}, false, fmt.Errorf("verify password: %w", err)
	}
	// A deactivated User fails exactly like a wrong password (Card 2 rule 10, ADR 0002).
	return record.User, matches && record.User.Active, nil
}

// recordLoginAttempt adds an attempt for email, known or not, and drops the ones that no longer count.
func (s *Service) recordLoginAttempt(ctx context.Context, email string, now time.Time) error {
	id, err := uuid.NewV7()
	if err != nil {
		return fmt.Errorf("new login failure id: %w", err)
	}
	if err := s.queries.DeleteLoginFailuresBefore(ctx, DeleteLoginFailuresBeforeParams{
		Email: email, FailedAt: lockoutWindowStart(now),
	}); err != nil {
		return fmt.Errorf("delete old login failures: %w", err)
	}
	if err := s.queries.RecordLoginFailure(ctx, RecordLoginFailureParams{ID: id, Email: email, FailedAt: now}); err != nil {
		return fmt.Errorf("record login attempt: %w", err)
	}
	return nil
}

// lockedError works out when email unlocks: once its maxLoginFailures-th latest attempt leaves the window, the
// next attempt makes at most maxLoginFailures.
func (s *Service) lockedError(ctx context.Context, email string, now time.Time) error {
	oldestCounted, err := s.queries.NthLatestLoginFailure(ctx, NthLatestLoginFailureParams{
		Email: email, Offset: maxLoginFailures - 1,
	})
	if err != nil {
		return fmt.Errorf("find when the lock ends: %w", err)
	}
	return &LockedError{RetryAfter: oldestCounted.Add(LockoutWindow).Sub(now)}
}

func lockoutWindowStart(now time.Time) time.Time {
	return now.Add(-LockoutWindow)
}

// Refresh replaces refreshToken with a new one in the same Session and issues a new access token (Card 2 rule 5).
func (s *Service) Refresh(ctx context.Context, refreshToken string) (IssuedSession, error) {
	now := s.now()
	stored, err := s.findRefreshToken(ctx, refreshToken)
	if err != nil {
		return IssuedSession{}, err
	}
	if stored.RevokedAt != nil {
		// A rotated token used again is either a second tab (within the grace window) or a stolen copy, so after
		// the window the whole Session ends (ADR 0002). A token revoked by logout just fails.
		wasRotated := stored.ReplacedBy != nil
		if wasRotated && now.Sub(*stored.RevokedAt) > reuseGraceWindow {
			if err := s.queries.RevokeSession(ctx, RevokeSessionParams{SessionID: stored.SessionID, RevokedAt: &now}); err != nil {
				return IssuedSession{}, fmt.Errorf("revoke session: %w", err)
			}
		}
		return IssuedSession{}, ErrInvalidRefreshToken
	}
	if !now.Before(stored.ExpiresAt) {
		return IssuedSession{}, ErrInvalidRefreshToken
	}
	user, err := s.users.FindByID(ctx, stored.UserID)
	if err != nil {
		return IssuedSession{}, fmt.Errorf("find user: %w", err)
	}
	if !user.Active {
		return IssuedSession{}, ErrInvalidRefreshToken // Card 2 rule 10
	}

	var session IssuedSession
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		queries := s.queries.WithTx(tx)
		issued, err := s.issue(ctx, queries, user, stored.SessionID, now)
		if err != nil {
			return err
		}
		rotated, err := queries.MarkRefreshTokenRotated(ctx, MarkRefreshTokenRotatedParams{
			ID: stored.ID, RevokedAt: &now, ReplacedBy: &issued.tokenID,
		})
		if err != nil {
			return fmt.Errorf("mark refresh token rotated: %w", err)
		}
		// Another request rotated this token since it was read: treat it like any rotated token.
		if rotated == 0 {
			return ErrInvalidRefreshToken
		}
		session = issued.IssuedSession
		return nil
	})
	if err != nil {
		return IssuedSession{}, err
	}
	return session, nil
}

// Logout revokes refreshToken (Card 2 rule 6). An unknown or already revoked token is not an error, so logging out
// can never get stuck.
func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	stored, err := s.findRefreshToken(ctx, refreshToken)
	if errors.Is(err, ErrInvalidRefreshToken) {
		return nil
	}
	if err != nil {
		return err
	}
	now := s.now()
	if err := s.queries.RevokeRefreshToken(ctx, RevokeRefreshTokenParams{ID: stored.ID, RevokedAt: &now}); err != nil {
		return fmt.Errorf("revoke refresh token: %w", err)
	}
	return nil
}

// findRefreshToken returns the stored token for refreshToken, or ErrInvalidRefreshToken when there is none.
func (s *Service) findRefreshToken(ctx context.Context, refreshToken string) (RefreshToken, error) {
	stored, err := s.queries.GetRefreshTokenByHash(ctx, platformauth.HashOpaqueToken(refreshToken))
	if errors.Is(err, pgx.ErrNoRows) {
		return RefreshToken{}, ErrInvalidRefreshToken
	}
	if err != nil {
		return RefreshToken{}, fmt.Errorf("find refresh token: %w", err)
	}
	return stored, nil
}

// issuedTokens is an IssuedSession plus the new refresh token's id, which rotation records as the old token's
// successor.
type issuedTokens struct {
	IssuedSession
	tokenID uuid.UUID
}

// issue creates a refresh token in sessionID and a fresh access token for user, both dated now.
func (s *Service) issue(ctx context.Context, queries *Queries, user users.User, sessionID uuid.UUID, now time.Time) (issuedTokens, error) {
	refreshToken, refreshHash, err := platformauth.NewOpaqueToken()
	if err != nil {
		return issuedTokens{}, err
	}
	tokenID, err := uuid.NewV7()
	if err != nil {
		return issuedTokens{}, fmt.Errorf("new refresh token id: %w", err)
	}
	refreshExpiresAt := now.Add(RefreshTokenTTL)
	if err := queries.CreateRefreshToken(ctx, CreateRefreshTokenParams{
		ID:        tokenID,
		UserID:    user.ID,
		SessionID: sessionID,
		TokenHash: refreshHash,
		ExpiresAt: refreshExpiresAt,
	}); err != nil {
		return issuedTokens{}, fmt.Errorf("store refresh token: %w", err)
	}
	accessToken, err := s.accessTokens.Issue(user.ID)
	if err != nil {
		return issuedTokens{}, err
	}
	return issuedTokens{
		IssuedSession: IssuedSession{
			AccessToken:      accessToken,
			ExpiresIn:        platformauth.AccessTokenTTL,
			RefreshToken:     refreshToken,
			RefreshExpiresAt: refreshExpiresAt,
			User:             user,
		},
		tokenID: tokenID,
	}, nil
}
