package members_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/auth"
	"github.com/BarbieriM/MiniManager/api/internal/features/members"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
	"github.com/BarbieriM/MiniManager/api/internal/platform/email"
	"github.com/BarbieriM/MiniManager/api/internal/platform/email/emailtest"
)

type fixture struct {
	service *members.Service
	users   *users.Service
	auth    *auth.Service
	admin   users.User
	pool    *pgxpool.Pool
}

func newFixture(t *testing.T) fixture {
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
	accessTokens := platformauth.NewAccessTokens([]byte("0123456789abcdef0123456789abcdef"), time.Now)
	authService, err := auth.NewService(pool, userService, accessTokens, &emailtest.Recorder{}, email.Links{BaseURL: "http://minis.test"}, time.Now)
	if err != nil {
		t.Fatalf("auth.NewService: %v", err)
	}
	return fixture{service: members.NewService(pool, userService, authService), users: userService, auth: authService, admin: admin, pool: pool}
}

func (f fixture) loggedInMember(t *testing.T) auth.IssuedSession {
	t.Helper()
	if _, err := f.users.Create(t.Context(), users.NewUser{Email: "ana@example.com", Password: "correct horse", DisplayName: "Ana", Role: users.RoleMember}); err != nil {
		t.Fatalf("Create Ana: %v", err)
	}
	session, err := f.auth.Login(t.Context(), "ana@example.com", "correct horse")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	return session
}

func TestCard4_Rule7_DeactivatingEndsEverySessionAndReactivatingStartsNone(t *testing.T) {
	f := newFixture(t)
	ana := f.loggedInMember(t)
	inactive, active := false, true

	if _, err := f.service.Update(t.Context(), f.admin, ana.User.ID, users.AccessChange{Active: &inactive}); err != nil {
		t.Fatalf("deactivate: %v", err)
	}
	if _, err := f.service.Update(t.Context(), f.admin, ana.User.ID, users.AccessChange{Active: &active}); err != nil {
		t.Fatalf("reactivate: %v", err)
	}

	if _, err := f.auth.Refresh(t.Context(), ana.RefreshToken); !errors.Is(err, auth.ErrInvalidRefreshToken) {
		t.Fatalf("Refresh after deactivating and reactivating: error = %v, want ErrInvalidRefreshToken", err)
	}
	if _, err := f.auth.Login(t.Context(), "ana@example.com", "correct horse"); err != nil {
		t.Fatalf("Login after reactivating: %v", err)
	}
}

func TestCard4_ARoleChangeKeepsTheUsersSessions(t *testing.T) {
	f := newFixture(t)
	ana := f.loggedInMember(t)
	admin := users.RoleAdmin

	if _, err := f.service.Update(t.Context(), f.admin, ana.User.ID, users.AccessChange{Role: &admin}); err != nil {
		t.Fatalf("promote: %v", err)
	}

	if _, err := f.auth.Refresh(t.Context(), ana.RefreshToken); err != nil {
		t.Fatalf("Refresh after a role change: %v", err)
	}
}

func TestCard4_Rule5_AMemberCannotListOrChangeUsers(t *testing.T) {
	f := newFixture(t)
	ana := f.loggedInMember(t)
	inactive := false

	_, listErr := f.service.List(t.Context(), ana.User)
	_, updateErr := f.service.Update(t.Context(), ana.User, f.admin.ID, users.AccessChange{Active: &inactive})

	if !errors.Is(listErr, users.ErrForbidden) || !errors.Is(updateErr, users.ErrForbidden) {
		t.Fatalf("List: %v, Update: %v; want ErrForbidden", listErr, updateErr)
	}
}

// failingSessions cannot end Sessions, as if the database refused the write.
type failingSessions struct{}

func (failingSessions) EndAllSessions(context.Context, pgx.Tx, uuid.UUID) error {
	return errors.New("revoke failed")
}

func TestCard4_DeactivatingIsUndoneWhenTheSessionsCannotBeEnded(t *testing.T) {
	f := newFixture(t)
	ana := f.loggedInMember(t)
	inactive := false

	_, err := members.NewService(f.pool, f.users, failingSessions{}).Update(t.Context(), f.admin, ana.User.ID, users.AccessChange{Active: &inactive})

	if err == nil {
		t.Fatal("Update succeeded although the Sessions could not be ended")
	}
	stored, findErr := f.users.FindByID(t.Context(), ana.User.ID)
	if findErr != nil || !stored.Active {
		t.Fatalf("Ana = %+v, %v; want her still active", stored, findErr)
	}
}
