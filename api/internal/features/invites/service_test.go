package invites_test

import (
	"errors"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/auth"
	"github.com/BarbieriM/MiniManager/api/internal/features/invites"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
	"github.com/BarbieriM/MiniManager/api/internal/platform/email"
	"github.com/BarbieriM/MiniManager/api/internal/platform/email/emailtest"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

type fixture struct {
	service *invites.Service
	users   *users.Service
	auth    *auth.Service
	outbox  *emailtest.Recorder
	pool    *pgxpool.Pool
	admin   users.User
	clock   time.Time
}

func newFixture(t *testing.T) *fixture {
	t.Helper()
	pool := dbtest.NewDatabase(t)
	userService := users.NewService(pool)
	if _, err := userService.CreateAdmin(t.Context(), users.NewAdmin{Email: "mateus@example.com", Password: "correct horse", DisplayName: "Mateus"}); err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	admin, err := userService.FindByEmail(t.Context(), "mateus@example.com")
	if err != nil {
		t.Fatalf("FindByEmail: %v", err)
	}
	f := &fixture{users: userService, outbox: &emailtest.Recorder{}, pool: pool, admin: admin,
		clock: time.Date(2026, 10, 11, 20, 0, 0, 0, time.UTC)}
	now := func() time.Time { return f.clock }
	links := email.Links{BaseURL: "http://minis.test"}
	accessTokens := platformauth.NewAccessTokens([]byte("0123456789abcdef0123456789abcdef"), now)
	f.auth, err = auth.NewService(pool, userService, accessTokens, f.outbox, links, now)
	if err != nil {
		t.Fatalf("auth.NewService: %v", err)
	}
	f.service = invites.NewService(pool, userService, f.auth, f.outbox, links, now)
	return f
}

var inviteLink = regexp.MustCompile(`^http://minis\.test/invite/(\S+)$`)

// tokenOf returns the token in a sent invite's link.
func tokenOf(t *testing.T, sent invites.SentInvite) string {
	t.Helper()
	match := inviteLink.FindStringSubmatch(sent.Link)
	if match == nil {
		t.Fatalf("link %q is not an invite link", sent.Link)
	}
	token, err := url.PathUnescape(match[1])
	if err != nil {
		t.Fatalf("unescape token: %v", err)
	}
	return token
}

func (f *fixture) invite(t *testing.T, emailAddress string, role users.Role) invites.SentInvite {
	t.Helper()
	sent, err := f.service.Send(t.Context(), f.admin, invites.NewInvite{Email: emailAddress, Role: role})
	if err != nil {
		t.Fatalf("Send %s: %v", emailAddress, err)
	}
	return sent
}

func (f *fixture) accept(t *testing.T, token, displayName string) (auth.IssuedSession, error) {
	t.Helper()
	return f.service.Accept(t.Context(), token, invites.SignUp{DisplayName: displayName, Password: "a good password"})
}

func assertField(t *testing.T, err error, field, message string) {
	t.Helper()
	var problems validation.Errors
	if !errors.As(err, &problems) || len(problems) != 1 || problems[0].Field != field || problems[0].Message != message {
		t.Fatalf("error = %v, want %s: %q", err, field, message)
	}
}

func (f *fixture) statuses(t *testing.T) map[string]invites.Status {
	t.Helper()
	listed, err := f.service.List(t.Context(), f.admin)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	statuses := map[string]invites.Status{}
	for _, invite := range listed {
		statuses[invite.ID.String()] = invite.Status
	}
	return statuses
}

func TestCard1_AcceptanceCriterion1_AnInviteIsPendingAndEmailed(t *testing.T) {
	f := newFixture(t)

	sent := f.invite(t, "ana@example.com", users.RoleMember)

	if sent.Status != invites.StatusPending || !sent.EmailSent || tokenOf(t, sent) == "" {
		t.Fatalf("sent = %+v, want a Pending invite that was emailed, with its link", sent)
	}
	messages := f.outbox.Sent()
	if len(messages) != 1 || messages[0].To != "ana@example.com" || !strings.Contains(messages[0].Body, sent.Link) {
		t.Fatalf("emails = %+v, want one to ana@example.com with the link", messages)
	}
}

func TestCard1_Rule1_AcceptanceCriterion4_OnlyAnAdminInvites(t *testing.T) {
	f := newFixture(t)
	sent := f.invite(t, "ana@example.com", users.RoleMember)
	ana, err := f.accept(t, tokenOf(t, sent), "Ana")
	if err != nil {
		t.Fatalf("Accept: %v", err)
	}

	_, sendErr := f.service.Send(t.Context(), ana.User, invites.NewInvite{Email: "bea@example.com", Role: users.RoleMember})
	_, listErr := f.service.List(t.Context(), ana.User)

	if !errors.Is(sendErr, users.ErrForbidden) || !errors.Is(listErr, users.ErrForbidden) {
		t.Fatalf("Send: %v, List: %v; want ErrForbidden for a Member", sendErr, listErr)
	}
}

func TestCard1_Rule2_AnEmailWithAnAccountCannotBeInvited(t *testing.T) {
	f := newFixture(t)

	_, err := f.service.Send(t.Context(), f.admin, invites.NewInvite{Email: "MATEUS@example.com", Role: users.RoleMember})

	assertField(t, err, "email", "This person already has an account.")
}

func TestCard1_ADeactivatedUserIsReactivatedNotInvited(t *testing.T) {
	f := newFixture(t)
	ana, err := f.accept(t, tokenOf(t, f.invite(t, "ana@example.com", users.RoleMember)), "Ana")
	if err != nil {
		t.Fatalf("Accept: %v", err)
	}
	inactive := false
	if _, err := f.users.ChangeAccess(t.Context(), f.admin, ana.User.ID, users.AccessChange{Active: &inactive}); err != nil {
		t.Fatalf("deactivate: %v", err)
	}

	_, err = f.service.Send(t.Context(), f.admin, invites.NewInvite{Email: "ana@example.com", Role: users.RoleMember})

	assertField(t, err, "email", "This person has a deactivated account. Reactivate them from Members.")
}

func TestCard1_Rule3_AcceptanceCriterion2_AnInviteExpiresAfter7Days(t *testing.T) {
	f := newFixture(t)
	sent := f.invite(t, "ana@example.com", users.RoleMember)
	f.clock = f.clock.Add(7*24*time.Hour + time.Second)

	_, checkErr := f.service.Check(t.Context(), tokenOf(t, sent))
	_, acceptErr := f.accept(t, tokenOf(t, sent), "Ana")

	if !errors.Is(checkErr, invites.ErrNoLongerValid) || !errors.Is(acceptErr, invites.ErrNoLongerValid) {
		t.Fatalf("Check: %v, Accept: %v; want ErrNoLongerValid", checkErr, acceptErr)
	}
	if got := f.statuses(t)[sent.ID.String()]; got != invites.StatusExpired {
		t.Errorf("status = %q, want expired", got)
	}
}

func TestCard1_Rule3_AnInviteWorksOnce(t *testing.T) {
	f := newFixture(t)
	token := tokenOf(t, f.invite(t, "ana@example.com", users.RoleMember))
	if _, err := f.accept(t, token, "Ana"); err != nil {
		t.Fatalf("first Accept: %v", err)
	}

	_, err := f.accept(t, token, "Ana Again")

	if !errors.Is(err, invites.ErrNoLongerValid) {
		t.Fatalf("second Accept: error = %v, want ErrNoLongerValid", err)
	}
}

func TestCard1_Rule4_ResendingKillsTheOldLinkAndGivesAFresh7Days(t *testing.T) {
	f := newFixture(t)
	first := f.invite(t, "ana@example.com", users.RoleAdmin)
	f.clock = f.clock.Add(8 * 24 * time.Hour) // expired

	resent, err := f.service.Resend(t.Context(), f.admin, first.ID)
	if err != nil {
		t.Fatalf("Resend: %v", err)
	}

	if _, err := f.service.Check(t.Context(), tokenOf(t, first)); !errors.Is(err, invites.ErrNoLongerValid) {
		t.Errorf("old link: error = %v, want ErrNoLongerValid", err)
	}
	if resent.Status != invites.StatusPending || resent.Role != users.RoleAdmin || !resent.ExpiresAt.Equal(f.clock.Add(7*24*time.Hour)) {
		t.Errorf("resent = %+v, want a Pending Admin invite expiring 7 days from now", resent)
	}
	if len(f.outbox.Sent()) != 2 {
		t.Errorf("sent %d emails, want 2", len(f.outbox.Sent()))
	}
}

func TestCard1_ASecondInviteToTheSameEmailReplacesTheFirst(t *testing.T) {
	f := newFixture(t)
	first := f.invite(t, "ana@example.com", users.RoleMember)
	second := f.invite(t, "ANA@example.com", users.RoleAdmin)

	if _, err := f.service.Check(t.Context(), tokenOf(t, first)); !errors.Is(err, invites.ErrNoLongerValid) {
		t.Errorf("first link: error = %v, want ErrNoLongerValid", err)
	}
	statuses := f.statuses(t)
	if statuses[first.ID.String()] != invites.StatusCancelled || statuses[second.ID.String()] != invites.StatusPending {
		t.Errorf("statuses = %v, want the first cancelled and the second pending", statuses)
	}
}

func TestCard1_ACancelledInviteNoLongerWorks(t *testing.T) {
	f := newFixture(t)
	sent := f.invite(t, "ana@example.com", users.RoleMember)

	if err := f.service.Cancel(t.Context(), f.admin, sent.ID); err != nil {
		t.Fatalf("Cancel: %v", err)
	}

	if _, err := f.service.Check(t.Context(), tokenOf(t, sent)); !errors.Is(err, invites.ErrNoLongerValid) {
		t.Fatalf("Check: error = %v, want ErrNoLongerValid", err)
	}
	if _, err := f.service.Resend(t.Context(), f.admin, sent.ID); !errors.Is(err, invites.ErrNotOpen) {
		t.Fatalf("Resend a cancelled invite: error = %v, want ErrNotOpen", err)
	}
}

func TestCard1_WhenTheEmailFailsTheInviteIsKeptWithItsLink(t *testing.T) {
	f := newFixture(t)
	f.outbox.Fail = true

	sent := f.invite(t, "ana@example.com", users.RoleMember)

	if sent.EmailSent || sent.Status != invites.StatusPending {
		t.Fatalf("sent = %+v, want a Pending invite whose email was not sent", sent)
	}
	if _, err := f.accept(t, tokenOf(t, sent), "Ana"); err != nil {
		t.Fatalf("Accept from the copied link: %v", err)
	}
}

func TestCard1_Rule5_TheInviteShowsItsEmail(t *testing.T) {
	f := newFixture(t)
	sent := f.invite(t, "Ana@Example.com", users.RoleMember)

	invite, err := f.service.Check(t.Context(), tokenOf(t, sent))

	if err != nil || invite.Email != "Ana@Example.com" {
		t.Fatalf("Check = %+v, %v; want the invite's email", invite, err)
	}
}

func TestCard1_Rule6_AcceptanceCriterion3_AcceptingCreatesTheUserWithTheInvitesRoleAndLogsIn(t *testing.T) {
	f := newFixture(t)
	sent := f.invite(t, "bea@example.com", users.RoleAdmin)

	session, err := f.accept(t, tokenOf(t, sent), "Bea")
	if err != nil {
		t.Fatalf("Accept: %v", err)
	}

	if session.AccessToken == "" || session.RefreshToken == "" {
		t.Error("Accept did not start a Session")
	}
	bea, err := f.users.FindByEmail(t.Context(), "bea@example.com")
	if err != nil || bea.Role != users.RoleAdmin || bea.DisplayName != "Bea" || !bea.Active {
		t.Fatalf("user = %+v, %v; want an active Admin named Bea", bea, err)
	}
	if got := f.statuses(t)[sent.ID.String()]; got != invites.StatusAccepted {
		t.Errorf("status = %q, want accepted", got)
	}
}

func TestCard1_SignUpChecksTheNameAndPassword(t *testing.T) {
	f := newFixture(t)
	token := tokenOf(t, f.invite(t, "ana@example.com", users.RoleMember))

	_, taken := f.accept(t, token, "mateus")
	_, weak := f.service.Accept(t.Context(), token, invites.SignUp{DisplayName: "Ana", Password: "short"})

	assertField(t, taken, "displayName", "Someone in the group already uses this name.")
	assertField(t, weak, "password", "Password must be 8 to 72 characters.")
	if _, err := f.accept(t, token, "Ana"); err != nil {
		t.Fatalf("Accept after fixing the name: %v", err)
	}
}

func TestCard1_InvitesAreListedNewestFirst(t *testing.T) {
	f := newFixture(t)
	f.invite(t, "ana@example.com", users.RoleMember)
	f.clock = f.clock.Add(time.Minute)
	f.invite(t, "bea@example.com", users.RoleMember)

	listed, err := f.service.List(t.Context(), f.admin)

	if err != nil || len(listed) != 2 || listed[0].Email != "bea@example.com" || listed[1].Email != "ana@example.com" {
		t.Fatalf("List = %+v, %v; want bea then ana", listed, err)
	}
}

func TestCard1_AnInviteWhoseEmailGotAnAccountMeanwhileIsNoLongerValid(t *testing.T) {
	f := newFixture(t)
	token := tokenOf(t, f.invite(t, "ana@example.com", users.RoleMember))
	if _, err := f.users.Create(t.Context(), users.NewUser{Email: "ana@example.com", Password: "correct horse", DisplayName: "Ana", Role: users.RoleMember}); err != nil {
		t.Fatalf("Create: %v", err)
	}

	_, checkErr := f.service.Check(t.Context(), token)
	_, acceptErr := f.accept(t, token, "Ana Again")

	if !errors.Is(checkErr, invites.ErrNoLongerValid) || !errors.Is(acceptErr, invites.ErrNoLongerValid) {
		t.Fatalf("Check: %v, Accept: %v; want ErrNoLongerValid", checkErr, acceptErr)
	}
}

func TestCard1_InvitesToTheSameEmailAtOnceAllSucceedAndLeaveOnePending(t *testing.T) {
	f := newFixture(t)

	var wait sync.WaitGroup
	errs := make([]error, 5)
	for i := range errs {
		wait.Go(func() {
			_, errs[i] = f.service.Send(t.Context(), f.admin, invites.NewInvite{Email: "ana@example.com", Role: users.RoleMember})
		})
	}
	wait.Wait()

	for _, err := range errs {
		if err != nil {
			t.Fatalf("Send: %v", err)
		}
	}
	pending := 0
	for _, status := range f.statuses(t) {
		if status == invites.StatusPending {
			pending++
		}
	}
	if pending != 1 {
		t.Errorf("%d Pending invites, want 1", pending)
	}
}
