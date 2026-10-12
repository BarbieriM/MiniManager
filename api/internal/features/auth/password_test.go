package auth_test

import (
	"context"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/BarbieriM/MiniManager/api/internal/features/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/email"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

var resetLink = regexp.MustCompile(`http://minis\.test/reset-password\?token=\S+`)

// requestReset asks for a reset for email and returns the token from the newest email, or "" when none was sent.
func (f fixture) requestReset(t *testing.T, emailAddress string) string {
	t.Helper()
	before := len(f.outbox.Sent())
	f.service.RequestPasswordReset(t.Context(), emailAddress)
	f.service.WaitForEmails()
	sent := f.outbox.Sent()
	if len(sent) == before {
		return ""
	}
	link := resetLink.FindString(sent[len(sent)-1].Body)
	if link == "" {
		t.Fatalf("email has no reset link:\n%s", sent[len(sent)-1].Body)
	}
	parsed, err := url.Parse(link)
	if err != nil {
		t.Fatalf("parse link: %v", err)
	}
	return parsed.Query().Get("token")
}

func assertField(t *testing.T, err error, field, message string) {
	t.Helper()
	var problems validation.Errors
	if !errors.As(err, &problems) || !problems.Has(field) || problems[0].Message != message {
		t.Fatalf("error = %v, want %s: %q", err, field, message)
	}
}

func TestCard2_Rule7_AResetRequestEmailsALinkToAnActiveUser(t *testing.T) {
	f := newFixture(t)

	token := f.requestReset(t, "MATEUS@example.com")

	sent := f.outbox.Sent()
	if token == "" || len(sent) != 1 || sent[0].To != adminEmail {
		t.Fatalf("sent %+v, want one reset email to %s", sent, adminEmail)
	}
	if !strings.Contains(sent[0].Body, "1 hour") {
		t.Errorf("body does not say the link lasts 1 hour:\n%s", sent[0].Body)
	}
}

func TestCard2_Rule7_AnUnknownEmailGetsNoEmail(t *testing.T) {
	f := newFixture(t)
	f.requestReset(t, "nobody@example.com")

	if sent := f.outbox.Sent(); len(sent) != 0 {
		t.Errorf("sent %d emails, want none", len(sent))
	}
}

func TestCard2_Rule10_ADeactivatedUserGetsNoResetEmail(t *testing.T) {
	f := newFixture(t)
	f.deactivateAdmin(t)
	f.requestReset(t, adminEmail)

	if sent := f.outbox.Sent(); len(sent) != 0 {
		t.Errorf("sent %d emails, want none", len(sent))
	}
}

// slowSender holds every email until release is closed, like a slow Resend.
type slowSender struct{ release chan struct{} }

func (s slowSender) Send(context.Context, email.Message) error {
	<-s.release
	return nil
}

func TestCard2_Rule7_TheResetAnswerDoesNotWaitForTheEmail(t *testing.T) {
	f := newFixture(t)
	sender := slowSender{release: make(chan struct{})}
	service, err := auth.NewService(f.pool, f.users, f.accessTokens, sender, email.Links{BaseURL: "http://minis.test"}, f.clock.Now)
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}

	answered := make(chan struct{})
	go func() {
		service.RequestPasswordReset(t.Context(), adminEmail)
		close(answered)
	}()

	select {
	case <-answered:
	case <-time.After(5 * time.Second):
		t.Fatal("the reset answer waited for the email, which shows the email has an account")
	}
	close(sender.release)
	service.WaitForEmails()
}

func TestCard2_Rule8_AResetLinkWorksOnce(t *testing.T) {
	f := newFixture(t)
	token := f.requestReset(t, adminEmail)

	if err := f.service.ConfirmPasswordReset(t.Context(), token, "a brand new password"); err != nil {
		t.Fatalf("ConfirmPasswordReset: %v", err)
	}
	if _, err := f.service.Login(t.Context(), adminEmail, "a brand new password"); err != nil {
		t.Fatalf("Login with the new password: %v", err)
	}
	err := f.service.ConfirmPasswordReset(t.Context(), token, "another new password")
	if !errors.Is(err, auth.ErrInvalidResetToken) {
		t.Fatalf("second use: error = %v, want ErrInvalidResetToken", err)
	}
}

func TestCard2_Rule8_AResetLinkExpiresAfterOneHourWith30SecondsOfSkew(t *testing.T) {
	f := newFixture(t)
	withinSkew := f.requestReset(t, adminEmail)
	f.clock.Advance(time.Hour + 20*time.Second)
	if err := f.service.ConfirmPasswordReset(t.Context(), withinSkew, "a brand new password"); err != nil {
		t.Fatalf("20 seconds late: %v", err)
	}

	late := f.requestReset(t, adminEmail)
	f.clock.Advance(time.Hour + 31*time.Second)
	err := f.service.ConfirmPasswordReset(t.Context(), late, "another new password")

	if !errors.Is(err, auth.ErrInvalidResetToken) {
		t.Fatalf("31 seconds late: error = %v, want ErrInvalidResetToken", err)
	}
}

func TestCard2_Rule8_OnlyTheNewestResetLinkWorks(t *testing.T) {
	f := newFixture(t)
	older := f.requestReset(t, adminEmail)
	newer := f.requestReset(t, adminEmail)

	olderErr := f.service.ConfirmPasswordReset(t.Context(), older, "a brand new password")
	newerErr := f.service.ConfirmPasswordReset(t.Context(), newer, "a brand new password")

	if !errors.Is(olderErr, auth.ErrInvalidResetToken) || newerErr != nil {
		t.Fatalf("older: %v, newer: %v; want only the newer to work", olderErr, newerErr)
	}
}

func TestCard2_Rule9_CompletingAResetEndsEverySession(t *testing.T) {
	f := newFixture(t)
	session := f.login(t)
	token := f.requestReset(t, adminEmail)

	if err := f.service.ConfirmPasswordReset(t.Context(), token, "a brand new password"); err != nil {
		t.Fatalf("ConfirmPasswordReset: %v", err)
	}

	if _, err := f.service.Refresh(t.Context(), session.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Fatalf("Refresh after reset: error = %v, want ErrInvalidRefreshToken", err)
	}
}

func TestCard2_Rule7_AtMostThreeResetEmailsPerUserPerHour(t *testing.T) {
	f := newFixture(t)
	for range 4 {
		f.requestReset(t, adminEmail)
		f.clock.Advance(time.Minute)
	}
	if sent := len(f.outbox.Sent()); sent != 3 {
		t.Fatalf("sent %d emails in an hour, want 3", sent)
	}

	f.clock.Advance(time.Hour)
	if token := f.requestReset(t, adminEmail); token == "" {
		t.Error("no email an hour later")
	}
}

func TestCard2_ACompletedResetClearsTheLoginLockout(t *testing.T) {
	f := newFixture(t)
	for range 6 {
		_, _ = f.service.Login(t.Context(), adminEmail, "wrong password")
	}
	token := f.requestReset(t, adminEmail)

	if err := f.service.ConfirmPasswordReset(t.Context(), token, "a brand new password"); err != nil {
		t.Fatalf("ConfirmPasswordReset: %v", err)
	}

	if _, err := f.service.Login(t.Context(), adminEmail, "a brand new password"); err != nil {
		t.Fatalf("Login after reset: %v, want the lockout cleared", err)
	}
}

func TestCard2_AResetChecksThePasswordAndKeepsTheLinkUsable(t *testing.T) {
	f := newFixture(t)
	token := f.requestReset(t, adminEmail)

	err := f.service.ConfirmPasswordReset(t.Context(), token, "short")
	assertField(t, err, "password", "Password must be 8 to 72 characters.")

	if err := f.service.ConfirmPasswordReset(t.Context(), token, "a brand new password"); err != nil {
		t.Fatalf("retry with a valid password: %v", err)
	}
}

func TestCard3_Rule2_AcceptanceCriterion2_AWrongCurrentPasswordChangesNothing(t *testing.T) {
	f := newFixture(t)
	session := f.login(t)

	err := f.service.ChangePassword(t.Context(), session.User, session.RefreshToken, auth.PasswordChange{Current: "wrong password", New: "a brand new password"})

	assertField(t, err, "currentPassword", "Current password is incorrect.")
	if _, err := f.service.Login(t.Context(), adminEmail, adminPassword); err != nil {
		t.Fatalf("Login with the old password: %v", err)
	}
}

func TestCard3_Rule3_AcceptanceCriterion3_ChangingThePasswordEndsOnlyTheOtherSessions(t *testing.T) {
	f := newFixture(t)
	laptop := f.login(t)
	phone := f.login(t)

	if err := f.service.ChangePassword(t.Context(), laptop.User, laptop.RefreshToken, auth.PasswordChange{Current: adminPassword, New: "a brand new password"}); err != nil {
		t.Fatalf("ChangePassword: %v", err)
	}

	if _, err := f.service.Refresh(t.Context(), laptop.RefreshToken); err != nil {
		t.Errorf("laptop refresh: %v, want its Session kept", err)
	}
	if _, err := f.service.Refresh(t.Context(), phone.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Errorf("phone refresh: error = %v, want ErrInvalidRefreshToken", err)
	}
}

func TestCard3_ChangingToTheSamePasswordIsAllowed(t *testing.T) {
	f := newFixture(t)
	session := f.login(t)

	if err := f.service.ChangePassword(t.Context(), session.User, session.RefreshToken, auth.PasswordChange{Current: adminPassword, New: adminPassword}); err != nil {
		t.Fatalf("ChangePassword to the same password: %v", err)
	}
}

func TestCard4_EndingAllSessionsLogsTheUserOutEverywhere(t *testing.T) {
	f := newFixture(t)
	session := f.login(t)

	if err := pgx.BeginFunc(t.Context(), f.pool, func(tx pgx.Tx) error {
		return f.service.EndAllSessions(t.Context(), tx, session.User.ID)
	}); err != nil {
		t.Fatalf("EndAllSessions: %v", err)
	}

	if _, err := f.service.Refresh(t.Context(), session.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Fatalf("Refresh: error = %v, want ErrInvalidRefreshToken", err)
	}
}
