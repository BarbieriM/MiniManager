package auth_test

import (
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/auth"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
)

const (
	adminEmail    = "mateus@example.com"
	adminPassword = "correct horse"
)

// testClock is a clock the test moves by hand, so time-based rules run without sleeping.
type testClock struct{ current time.Time }

func (c *testClock) Now() time.Time           { return c.current }
func (c *testClock) Advance(by time.Duration) { c.current = c.current.Add(by) }

type fixture struct {
	service      *auth.Service
	users        *users.Service
	accessTokens *platformauth.AccessTokens
	clock        *testClock
	pool         *pgxpool.Pool
}

// newFixture returns an auth Service over a fresh database holding one active Admin.
func newFixture(t *testing.T) fixture {
	t.Helper()
	pool := dbtest.NewDatabase(t)
	clock := &testClock{current: time.Date(2026, 10, 10, 20, 0, 0, 0, time.UTC)}
	userService := users.NewService(pool)
	if _, err := userService.CreateAdmin(t.Context(), users.NewAdmin{
		Email: adminEmail, Password: adminPassword, DisplayName: "Mateus",
	}); err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	accessTokens := platformauth.NewAccessTokens([]byte("0123456789abcdef0123456789abcdef"), clock.Now)
	service, err := auth.NewService(pool, userService, accessTokens, clock.Now)
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}
	return fixture{service: service, users: userService, accessTokens: accessTokens, clock: clock, pool: pool}
}

func (f fixture) login(t *testing.T) auth.IssuedSession {
	t.Helper()
	result, err := f.service.Login(t.Context(), adminEmail, adminPassword)
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	return result
}

func TestCard2_Rule4_LoginReturnsAnAccessTokenAndA7DayRefreshToken(t *testing.T) {
	f := newFixture(t)

	result := f.login(t)

	userID, err := f.accessTokens.Verify(result.AccessToken)
	if err != nil {
		t.Fatalf("access token does not verify: %v", err)
	}
	if userID != result.User.ID {
		t.Errorf("access token is for %v, want %v", userID, result.User.ID)
	}
	if result.ExpiresIn != 15*time.Minute {
		t.Errorf("ExpiresIn = %v, want 15m", result.ExpiresIn)
	}
	if result.RefreshToken == "" {
		t.Error("no refresh token")
	}
	if want := f.clock.Now().Add(7 * 24 * time.Hour); !result.RefreshExpiresAt.Equal(want) {
		t.Errorf("RefreshExpiresAt = %v, want %v", result.RefreshExpiresAt, want)
	}
	if result.User.DisplayName != "Mateus" || result.User.Role != users.RoleAdmin {
		t.Errorf("User = %+v, want Mateus the Admin", result.User)
	}
}

func TestCard2_Rule1_EmailIsComparedCaseInsensitively(t *testing.T) {
	f := newFixture(t)

	if _, err := f.service.Login(t.Context(), "MATEUS@Example.COM", adminPassword); err != nil {
		t.Fatalf("Login with different letter case: %v", err)
	}
}

func TestCard2_Rule2_UnknownEmailAndWrongPasswordGiveTheSameError(t *testing.T) {
	f := newFixture(t)

	_, wrongPassword := f.service.Login(t.Context(), adminEmail, "wrong password")
	_, unknownEmail := f.service.Login(t.Context(), "nobody@example.com", adminPassword)

	if !errors.Is(wrongPassword, auth.ErrInvalidCredentials) {
		t.Errorf("wrong password error = %v, want ErrInvalidCredentials", wrongPassword)
	}
	if !errors.Is(unknownEmail, auth.ErrInvalidCredentials) {
		t.Errorf("unknown email error = %v, want ErrInvalidCredentials", unknownEmail)
	}
	if wrongPassword != nil && unknownEmail != nil && wrongPassword.Error() != unknownEmail.Error() {
		t.Errorf("errors differ: %q vs %q", wrongPassword, unknownEmail)
	}
}

func (f fixture) failLogins(t *testing.T, email string, times int) {
	t.Helper()
	for range times {
		if _, err := f.service.Login(t.Context(), email, "wrong password"); !errors.Is(err, auth.ErrInvalidCredentials) {
			t.Fatalf("failed Login error = %v, want ErrInvalidCredentials", err)
		}
		f.clock.Advance(time.Minute)
	}
}

func TestCard2_Rule3_FiveFailuresIn15MinutesLockTheEmail(t *testing.T) {
	f := newFixture(t)
	f.failLogins(t, adminEmail, 5)

	_, err := f.service.Login(t.Context(), adminEmail, adminPassword)

	if !errors.Is(err, auth.ErrLocked) {
		t.Fatalf("Login with the right password after 5 failures: error = %v, want ErrLocked", err)
	}
}

func TestCard2_Rule3_UnknownEmailsLockLikeKnownOnes(t *testing.T) {
	f := newFixture(t)
	f.failLogins(t, "nobody@example.com", 5)

	_, err := f.service.Login(t.Context(), "nobody@example.com", "wrong password")

	if !errors.Is(err, auth.ErrLocked) {
		t.Fatalf("6th Login for an unknown email: error = %v, want ErrLocked", err)
	}
}

func TestCard2_Rule3_TheLockEndsWhenFailuresAreOlderThan15Minutes(t *testing.T) {
	f := newFixture(t)
	f.failLogins(t, adminEmail, 5) // at minutes 0 to 4; the clock is now at minute 5

	f.clock.Advance(10 * time.Minute) // minute 15: the first failure is exactly 15 minutes old

	if _, err := f.service.Login(t.Context(), adminEmail, adminPassword); err != nil {
		t.Fatalf("Login once a failure has left the window: %v", err)
	}
}

func TestCard2_Rule3_ASuccessfulLoginClearsEarlierFailures(t *testing.T) {
	f := newFixture(t)
	f.failLogins(t, adminEmail, 4)
	f.login(t)

	f.failLogins(t, adminEmail, 4)

	if _, err := f.service.Login(t.Context(), adminEmail, adminPassword); err != nil {
		t.Fatalf("Login after 4 + 4 failures split by a success: %v", err)
	}
}

func TestCard2_Rule5_RefreshIssuesANewTokenAndRevokesTheOld(t *testing.T) {
	f := newFixture(t)
	first := f.login(t)

	second, err := f.service.Refresh(t.Context(), first.RefreshToken)
	if err != nil {
		t.Fatalf("Refresh: %v", err)
	}
	if second.RefreshToken == first.RefreshToken {
		t.Error("Refresh returned the same refresh token")
	}
	if userID, err := f.accessTokens.Verify(second.AccessToken); err != nil || userID != first.User.ID {
		t.Errorf("new access token is for %v (error %v), want %v", userID, err, first.User.ID)
	}

	if _, err := f.service.Refresh(t.Context(), first.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Errorf("Refresh with the old token: error = %v, want ErrInvalidRefreshToken", err)
	}
}

func TestCard2_Rule5_EachRefreshStartsANew7Days(t *testing.T) {
	f := newFixture(t)
	first := f.login(t)
	f.clock.Advance(6 * 24 * time.Hour)

	second, err := f.service.Refresh(t.Context(), first.RefreshToken)
	if err != nil {
		t.Fatalf("Refresh on day 6: %v", err)
	}
	if want := f.clock.Now().Add(7 * 24 * time.Hour); !second.RefreshExpiresAt.Equal(want) {
		t.Errorf("RefreshExpiresAt = %v, want %v", second.RefreshExpiresAt, want)
	}
}

func TestCard2_Rule4_ARefreshTokenUnusedFor7DaysIsRejected(t *testing.T) {
	f := newFixture(t)
	first := f.login(t)
	f.clock.Advance(7 * 24 * time.Hour)

	if _, err := f.service.Refresh(t.Context(), first.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Fatalf("Refresh after 7 days: error = %v, want ErrInvalidRefreshToken", err)
	}
}

func TestCard2_Rule5_ReusingARotatedTokenAfter30SecondsEndsTheSession(t *testing.T) {
	f := newFixture(t)
	stolen := f.login(t)
	current, err := f.service.Refresh(t.Context(), stolen.RefreshToken)
	if err != nil {
		t.Fatalf("Refresh: %v", err)
	}
	f.clock.Advance(31 * time.Second)

	if _, err := f.service.Refresh(t.Context(), stolen.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Fatalf("reuse of the rotated token: error = %v, want ErrInvalidRefreshToken", err)
	}
	if _, err := f.service.Refresh(t.Context(), current.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Errorf("the Session's current token still works after reuse: error = %v", err)
	}
}

func TestCard2_Rule5_ReusingARotatedTokenWithin30SecondsKeepsTheSession(t *testing.T) {
	f := newFixture(t)
	first := f.login(t)
	current, err := f.service.Refresh(t.Context(), first.RefreshToken) // tab 1
	if err != nil {
		t.Fatalf("Refresh: %v", err)
	}
	f.clock.Advance(2 * time.Second)

	// Tab 2 sent the same cookie a moment later.
	if _, err := f.service.Refresh(t.Context(), first.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Fatalf("second use of the token: error = %v, want ErrInvalidRefreshToken", err)
	}
	// Tab 2 retries with the new cookie.
	if _, err := f.service.Refresh(t.Context(), current.RefreshToken); err != nil {
		t.Errorf("the Session ended inside the grace window: %v", err)
	}
}

func TestCard2_Rule6_LogoutRevokesTheRefreshToken(t *testing.T) {
	f := newFixture(t)
	session := f.login(t)

	if err := f.service.Logout(t.Context(), session.RefreshToken); err != nil {
		t.Fatalf("Logout: %v", err)
	}

	if _, err := f.service.Refresh(t.Context(), session.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Fatalf("Refresh after logout: error = %v, want ErrInvalidRefreshToken", err)
	}
}

func TestCard2_Rule6_LogoutWithAnUnknownOrUsedTokenStillSucceeds(t *testing.T) {
	f := newFixture(t)
	session := f.login(t)
	if err := f.service.Logout(t.Context(), session.RefreshToken); err != nil {
		t.Fatalf("first Logout: %v", err)
	}

	if err := f.service.Logout(t.Context(), session.RefreshToken); err != nil {
		t.Errorf("second Logout: %v", err)
	}
	if err := f.service.Logout(t.Context(), "not a token"); err != nil {
		t.Errorf("Logout with an unknown token: %v", err)
	}
}

// deactivateAdmin stands in for Card 4's deactivation, which does not exist yet.
func (f fixture) deactivateAdmin(t *testing.T) {
	t.Helper()
	if _, err := f.pool.Exec(t.Context(), "UPDATE users SET active = false WHERE email = $1", adminEmail); err != nil {
		t.Fatalf("deactivate: %v", err)
	}
}

func TestCard2_Rule10_ADeactivatedUserCannotLogIn(t *testing.T) {
	f := newFixture(t)
	f.deactivateAdmin(t)

	_, err := f.service.Login(t.Context(), adminEmail, adminPassword)

	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("Login as a deactivated User: error = %v, want ErrInvalidCredentials", err)
	}
}

func TestCard2_Rule10_ADeactivatedUserCannotRefresh(t *testing.T) {
	f := newFixture(t)
	session := f.login(t)
	f.deactivateAdmin(t)

	if _, err := f.service.Refresh(t.Context(), session.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Fatalf("Refresh as a deactivated User: error = %v, want ErrInvalidRefreshToken", err)
	}
}

func TestCard2_Rule3_RefusedAttemptsKeepTheEmailLockedFor15Minutes(t *testing.T) {
	f := newFixture(t)
	f.failLogins(t, adminEmail, 5) // minutes 0 to 4
	if _, err := f.service.Login(t.Context(), adminEmail, adminPassword); !errors.Is(err, auth.ErrLocked) {
		t.Fatalf("Login at minute 5: error = %v, want ErrLocked", err)
	}

	f.clock.Advance(10 * time.Minute) // minute 15: still within 15 minutes of the refused attempt
	if _, err := f.service.Login(t.Context(), adminEmail, adminPassword); !errors.Is(err, auth.ErrLocked) {
		t.Fatalf("Login at minute 15: error = %v, want ErrLocked", err)
	}

	f.clock.Advance(16 * time.Minute) // minute 31: 16 minutes after the last refused attempt
	if _, err := f.service.Login(t.Context(), adminEmail, adminPassword); err != nil {
		t.Fatalf("Login at minute 31: %v", err)
	}
}

func TestCard2_Rule3_TheLockSaysWhenToTryAgain(t *testing.T) {
	f := newFixture(t)
	f.failLogins(t, adminEmail, 5) // minutes 0 to 4; the clock is now at minute 5

	_, err := f.service.Login(t.Context(), adminEmail, adminPassword)

	var locked *auth.LockedError
	if !errors.As(err, &locked) {
		t.Fatalf("error = %v, want a *LockedError", err)
	}
	// Attempts at minutes 1, 2, 3, 4 and 5 count until minute 1's leaves the window at minute 16.
	if locked.RetryAfter != 11*time.Minute {
		t.Errorf("RetryAfter = %v, want 11m", locked.RetryAfter)
	}
}

func TestCard2_Rule3_ParallelGuessesCannotGetPastTheLock(t *testing.T) {
	f := newFixture(t)
	const guesses = 8
	results := make(chan error, guesses)
	var wg sync.WaitGroup
	for range guesses {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := f.service.Login(t.Context(), adminEmail, "wrong password")
			results <- err
		}()
	}
	wg.Wait()
	close(results)

	checked := 0
	for err := range results {
		switch {
		case errors.Is(err, auth.ErrInvalidCredentials):
			checked++
		case errors.Is(err, auth.ErrLocked):
		default:
			t.Fatalf("Login error = %v", err)
		}
	}
	if checked > 5 {
		t.Errorf("%d parallel guesses had their password checked, want at most 5", checked)
	}
}

func TestCard2_PasswordsLongerThan72CharactersAreRefused(t *testing.T) {
	f := newFixture(t)

	_, err := f.service.Login(t.Context(), adminEmail, strings.Repeat("a", 73))

	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("error = %v, want ErrInvalidCredentials", err)
	}
}
