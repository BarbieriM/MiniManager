package auth

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/url"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/email"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Password reset settings (Card 2 rule 8, and the limit clarified 2026-10-11).
const (
	resetTokenTTL      = time.Hour
	resetClockSkew     = 30 * time.Second
	maxResetsPerWindow = 3
	resetWindow        = time.Hour
)

// ErrInvalidResetToken means the reset link is unknown, used, expired or not the User's newest (Card 2 rule 8).
var ErrInvalidResetToken = errors.New("reset link is invalid or expired")

// RequestPasswordReset emails a 1-hour reset link to email's User (Card 2 rule 7). It returns at once and does the
// work in the background, so the answer takes as long for an unknown email as for a real one and cannot reveal
// which emails have accounts. Unknown and deactivated emails, and Users already sent 3 links in the last hour, get
// no email. Failures are logged without the address or the link.
func (s *Service) RequestPasswordReset(ctx context.Context, emailAddress string) {
	// The work outlives the request, so it must not be cancelled when the request ends.
	ctx = context.WithoutCancel(ctx)
	s.emails.Go(func() {
		if err := s.sendPasswordReset(ctx, emailAddress); err != nil {
			log.Printf("password reset: %v", err)
		}
	})
}

// WaitForEmails waits until every reset email started so far is sent or has failed. The server calls it before
// shutting down; tests call it before reading what was sent.
func (s *Service) WaitForEmails() {
	s.emails.Wait()
}

func (s *Service) sendPasswordReset(ctx context.Context, emailAddress string) error {
	user, err := s.users.FindByEmail(ctx, emailAddress)
	if errors.Is(err, users.ErrNotFound) || (err == nil && !user.Active) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("find user: %w", err)
	}
	now := s.now()
	recent, err := s.queries.CountPasswordResetTokensSince(ctx, CountPasswordResetTokensSinceParams{
		UserID: user.ID, CreatedAt: now.Add(-resetWindow),
	})
	if err != nil {
		return fmt.Errorf("count recent resets: %w", err)
	}
	if recent >= maxResetsPerWindow {
		return nil
	}

	token, tokenHash, err := platformauth.NewOpaqueToken()
	if err != nil {
		return err
	}
	id, err := uuid.NewV7()
	if err != nil {
		return fmt.Errorf("new reset token id: %w", err)
	}
	if err := s.queries.CreatePasswordResetToken(ctx, CreatePasswordResetTokenParams{
		ID: id, UserID: user.ID, TokenHash: tokenHash, ExpiresAt: now.Add(resetTokenTTL), CreatedAt: now,
	}); err != nil {
		return fmt.Errorf("store reset token: %w", err)
	}
	link := s.links.To("/reset-password", url.Values{"token": {token}})
	return s.sender.Send(ctx, resetEmail(user, link))
}

func resetEmail(user users.User, link string) email.Message {
	return email.Message{
		To:      user.Email,
		Subject: "Reset your Mini Manager password",
		Body: fmt.Sprintf("Hi %s,\n\nSomeone asked to reset your Mini Manager password. To choose a new one, open:\n\n%s\n\n"+
			"The link works once and expires in 1 hour. If you did not ask for it, ignore this email.\n",
			user.DisplayName, link),
	}
}

// ConfirmPasswordReset sets a new password from a reset link (Card 2 rules 8 and 9): the token must be the User's
// newest, unused, and under 1 hour old (30 seconds of skew allowed). It ends every Session of the User and clears
// their login lockout. An invalid password leaves the link usable.
func (s *Service) ConfirmPasswordReset(ctx context.Context, token, newPassword string) error {
	if err := users.PasswordProblems("password", newPassword).OrNil(); err != nil {
		return err
	}
	now := s.now()
	stored, err := s.queries.GetPasswordResetTokenByHash(ctx, platformauth.HashOpaqueToken(token))
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrInvalidResetToken
	}
	if err != nil {
		return fmt.Errorf("find reset token: %w", err)
	}
	if stored.UsedAt != nil || now.After(stored.ExpiresAt.Add(resetClockSkew)) {
		return ErrInvalidResetToken
	}
	newestID, err := s.queries.GetNewestPasswordResetTokenID(ctx, stored.UserID)
	if err != nil {
		return fmt.Errorf("find newest reset token: %w", err)
	}
	if newestID != stored.ID {
		return ErrInvalidResetToken
	}
	user, err := s.users.FindByID(ctx, stored.UserID)
	if err != nil {
		return fmt.Errorf("find user: %w", err)
	}
	if !user.Active {
		return ErrInvalidResetToken
	}

	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		queries := s.queries.WithTx(tx)
		used, err := queries.MarkPasswordResetTokenUsed(ctx, MarkPasswordResetTokenUsedParams{ID: stored.ID, UsedAt: &now})
		if err != nil {
			return fmt.Errorf("mark reset token used: %w", err)
		}
		if used == 0 {
			return ErrInvalidResetToken // another request used it first
		}
		if err := s.users.WithTx(tx).SetPassword(ctx, user.ID, "password", newPassword); err != nil {
			return err
		}
		if err := queries.RevokeUserSessions(ctx, RevokeUserSessionsParams{UserID: user.ID, RevokedAt: &now}); err != nil {
			return fmt.Errorf("revoke sessions: %w", err)
		}
		if err := queries.ClearLoginFailures(ctx, user.Email); err != nil {
			return fmt.Errorf("clear login failures: %w", err)
		}
		return nil
	})
}

// PasswordChange is a User's current password and the one replacing it (Card 3 inputs).
type PasswordChange struct {
	Current string
	New     string
}

// ChangePassword sets actor's new password after checking the current one (Card 3 rule 2), then ends every other
// Session (rule 3). refreshToken is the request's refresh cookie, which says which Session to keep; when it is
// missing or not actor's, every Session ends.
func (s *Service) ChangePassword(ctx context.Context, actor users.User, refreshToken string, change PasswordChange) error {
	record, err := s.users.FindLoginRecord(ctx, actor.Email)
	if err != nil {
		return fmt.Errorf("find user: %w", err)
	}
	matches, err := platformauth.VerifyPassword(change.Current, record.PasswordHash)
	if err != nil {
		return fmt.Errorf("verify password: %w", err)
	}
	var problems validation.Errors
	if !matches {
		problems.Add("currentPassword", "Current password is incorrect.")
	}
	problems = append(problems, users.PasswordProblems("newPassword", change.New)...)
	if err := problems.OrNil(); err != nil {
		return err
	}

	keepSessionID := uuid.Nil
	if stored, err := s.findRefreshToken(ctx, refreshToken); err == nil && stored.UserID == actor.ID {
		keepSessionID = stored.SessionID
	} else if err != nil && !errors.Is(err, ErrInvalidRefreshToken) {
		return err
	}
	now := s.now()
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if err := s.users.WithTx(tx).SetPassword(ctx, actor.ID, "newPassword", change.New); err != nil {
			return err
		}
		if err := s.queries.WithTx(tx).RevokeOtherUserSessions(ctx, RevokeOtherUserSessionsParams{
			UserID: actor.ID, RevokedAt: &now, KeepSessionID: keepSessionID,
		}); err != nil {
			return fmt.Errorf("revoke other sessions: %w", err)
		}
		return nil
	})
}
