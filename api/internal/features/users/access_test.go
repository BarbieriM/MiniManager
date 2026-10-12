package users_test

import (
	"errors"
	"slices"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// group is a fresh database with the seeded Admin Mateus.
type group struct {
	service *users.Service
	pool    *pgxpool.Pool
	admin   users.User
}

func newGroup(t *testing.T) group {
	t.Helper()
	pool := dbtest.NewDatabase(t)
	service := users.NewService(pool)
	if _, err := service.CreateAdmin(t.Context(), users.NewAdmin{Email: "mateus@example.com", Password: "correct horse", DisplayName: "Mateus"}); err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	admin, err := service.FindByEmail(t.Context(), "mateus@example.com")
	if err != nil {
		t.Fatalf("FindByEmail: %v", err)
	}
	return group{service: service, pool: pool, admin: admin}
}

func (g group) add(t *testing.T, displayName string, role users.Role) users.User {
	t.Helper()
	user, err := g.service.Create(t.Context(), users.NewUser{
		Email: displayName + "@example.com", Password: "correct horse", DisplayName: displayName, Role: role,
	})
	if err != nil {
		t.Fatalf("Create %s: %v", displayName, err)
	}
	return user
}

func ptr[Value any](value Value) *Value { return &value }

func assertProblem(t *testing.T, err error, field, message string) {
	t.Helper()
	var problems validation.Errors
	if !errors.As(err, &problems) || len(problems) != 1 || problems[0].Field != field || problems[0].Message != message {
		t.Fatalf("error = %v, want %s: %q", err, field, message)
	}
}

func TestCard3_Rule5_DisplayNamesAreUniqueIgnoringCase(t *testing.T) {
	g := newGroup(t)

	_, err := g.service.Create(t.Context(), users.NewUser{Email: "other@example.com", Password: "correct horse", DisplayName: "MATEUS", Role: users.RoleMember})

	assertProblem(t, err, "displayName", "Someone in the group already uses this name.")
}

func TestCard1_Rule2_CreatingAUserForATakenEmailIsRefused(t *testing.T) {
	g := newGroup(t)

	_, err := g.service.Create(t.Context(), users.NewUser{Email: "Mateus@Example.com", Password: "correct horse", DisplayName: "Another", Role: users.RoleMember})

	if !errors.Is(err, users.ErrEmailTaken) {
		t.Fatalf("error = %v, want ErrEmailTaken", err)
	}
}

func TestCard3_Rule1_AUserChangesTheirDisplayName(t *testing.T) {
	g := newGroup(t)

	changed, err := g.service.UpdateProfile(t.Context(), g.admin, users.Profile{DisplayName: "Mateus B"})
	if err != nil {
		t.Fatalf("UpdateProfile: %v", err)
	}
	stored, err := g.service.FindByID(t.Context(), g.admin.ID)
	if err != nil {
		t.Fatalf("FindByID: %v", err)
	}
	if changed.DisplayName != "Mateus B" || stored.DisplayName != "Mateus B" {
		t.Errorf("name = %q (stored %q), want Mateus B", changed.DisplayName, stored.DisplayName)
	}
}

func TestCard3_SavingAnUnchangedProfileSucceeds(t *testing.T) {
	g := newGroup(t)

	if _, err := g.service.UpdateProfile(t.Context(), g.admin, users.Profile{DisplayName: "Mateus"}); err != nil {
		t.Fatalf("UpdateProfile with the same name: %v", err)
	}
}

func TestCard3_ProfileNamesFollowTheCardLimitsAndUniqueness(t *testing.T) {
	g := newGroup(t)
	ana := g.add(t, "Ana", users.RoleMember)

	_, tooShort := g.service.UpdateProfile(t.Context(), ana, users.Profile{DisplayName: "A"})
	_, taken := g.service.UpdateProfile(t.Context(), ana, users.Profile{DisplayName: "mateus"})

	assertProblem(t, tooShort, "displayName", "Name must be 2 to 40 characters.")
	assertProblem(t, taken, "displayName", "Someone in the group already uses this name.")
}

func TestCard4_Rule5_OnlyAnAdminChangesRolesOrDeactivates(t *testing.T) {
	g := newGroup(t)
	ana := g.add(t, "Ana", users.RoleMember)

	_, err := g.service.ChangeAccess(t.Context(), ana, g.admin.ID, users.AccessChange{Role: ptr(users.RoleMember)})

	if !errors.Is(err, users.ErrForbidden) {
		t.Fatalf("error = %v, want ErrForbidden", err)
	}
}

func TestCard4_Rule5_AnAdminChangesARoleAndDeactivatesAndReactivates(t *testing.T) {
	g := newGroup(t)
	ana := g.add(t, "Ana", users.RoleMember)

	promoted, err := g.service.ChangeAccess(t.Context(), g.admin, ana.ID, users.AccessChange{Role: ptr(users.RoleAdmin)})
	if err != nil || promoted.Role != users.RoleAdmin {
		t.Fatalf("promote: %v, role %q", err, promoted.Role)
	}
	deactivated, err := g.service.ChangeAccess(t.Context(), g.admin, ana.ID, users.AccessChange{Active: ptr(false)})
	if err != nil || deactivated.Active {
		t.Fatalf("deactivate: %v, active %v", err, deactivated.Active)
	}
	reactivated, err := g.service.ChangeAccess(t.Context(), g.admin, ana.ID, users.AccessChange{Active: ptr(true)})
	if err != nil || !reactivated.Active || reactivated.Role != users.RoleAdmin {
		t.Fatalf("reactivate: %v, active %v, role %q", err, reactivated.Active, reactivated.Role)
	}
}

func TestCard4_Rule6_AcceptanceCriterion3_TheOnlyAdminCannotDemoteThemself(t *testing.T) {
	g := newGroup(t)

	_, err := g.service.ChangeAccess(t.Context(), g.admin, g.admin.ID, users.AccessChange{Role: ptr(users.RoleMember)})

	if !errors.Is(err, users.ErrLastAdmin) {
		t.Fatalf("error = %v, want ErrLastAdmin", err)
	}
}

func TestCard4_Rule6_ADeactivatedAdminDoesNotCountAsTheOtherAdmin(t *testing.T) {
	g := newGroup(t)
	bea := g.add(t, "Bea", users.RoleAdmin)
	if _, err := g.service.ChangeAccess(t.Context(), g.admin, bea.ID, users.AccessChange{Active: ptr(false)}); err != nil {
		t.Fatalf("deactivate Bea: %v", err)
	}

	_, err := g.service.ChangeAccess(t.Context(), g.admin, g.admin.ID, users.AccessChange{Role: ptr(users.RoleMember)})

	if !errors.Is(err, users.ErrLastAdmin) {
		t.Fatalf("error = %v, want ErrLastAdmin", err)
	}
}

func TestCard4_AnAdminDemotesThemselfWhileAnotherAdminExists(t *testing.T) {
	g := newGroup(t)
	g.add(t, "Bea", users.RoleAdmin)

	demoted, err := g.service.ChangeAccess(t.Context(), g.admin, g.admin.ID, users.AccessChange{Role: ptr(users.RoleMember)})

	if err != nil || demoted.Role != users.RoleMember {
		t.Fatalf("demote self: %v, role %q", err, demoted.Role)
	}
}

func TestCard4_AnAdminCannotDeactivateThemself(t *testing.T) {
	g := newGroup(t)
	g.add(t, "Bea", users.RoleAdmin)

	_, err := g.service.ChangeAccess(t.Context(), g.admin, g.admin.ID, users.AccessChange{Active: ptr(false)})

	if !errors.Is(err, users.ErrDeactivateSelf) {
		t.Fatalf("error = %v, want ErrDeactivateSelf", err)
	}
}

func TestCard4_Rule6_TwoAdminsDemotingEachOtherAtOnceLeaveOneAdmin(t *testing.T) {
	g := newGroup(t)
	bea := g.add(t, "Bea", users.RoleAdmin)

	var wait sync.WaitGroup
	errs := make([]error, 2)
	for i, change := range []struct{ actor, target users.User }{{g.admin, bea}, {bea, g.admin}} {
		wait.Go(func() {
			_, errs[i] = g.service.ChangeAccess(t.Context(), change.actor, change.target.ID, users.AccessChange{Role: ptr(users.RoleMember)})
		})
	}
	wait.Wait()

	// The second change is refused either as the last Admin or, when the first one demoted its actor, as no
	// longer allowed.
	refused := 0
	for _, err := range errs {
		if errors.Is(err, users.ErrLastAdmin) || errors.Is(err, users.ErrForbidden) {
			refused++
		} else if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}
	if refused != 1 {
		t.Errorf("%d of the two demotions were refused, want exactly 1", refused)
	}
	listed, err := g.service.List(t.Context(), g.admin)
	if err != nil {
		listed, err = g.service.List(t.Context(), bea)
	}
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	admins := 0
	for _, user := range listed {
		if user.Role == users.RoleAdmin {
			admins++
		}
	}
	if admins != 1 {
		t.Errorf("%d Admins left, want 1", admins)
	}
}

func TestCard4_TheMembersListShowsActiveUsersAToZThenDeactivatedOnes(t *testing.T) {
	g := newGroup(t)
	g.add(t, "bea", users.RoleMember)
	zoe := g.add(t, "Zoe", users.RoleMember)
	g.add(t, "Ana", users.RoleMember)
	if _, err := g.service.ChangeAccess(t.Context(), g.admin, zoe.ID, users.AccessChange{Active: ptr(false)}); err != nil {
		t.Fatalf("deactivate Zoe: %v", err)
	}
	g.add(t, "Carl", users.RoleMember)

	listed, err := g.service.List(t.Context(), g.admin)
	if err != nil {
		t.Fatalf("List: %v", err)
	}

	names := make([]string, len(listed))
	for i, user := range listed {
		names[i] = user.DisplayName
	}
	if want := []string{"Ana", "bea", "Carl", "Mateus", "Zoe"}; !slices.Equal(names, want) {
		t.Errorf("names = %q, want %q", names, want)
	}
}

func TestCard4_Rule5_AnAdminDemotedMeanwhileCannotChangeAccess(t *testing.T) {
	g := newGroup(t)
	bea := g.add(t, "Bea", users.RoleAdmin)
	ana := g.add(t, "Ana", users.RoleMember)
	if _, err := g.service.ChangeAccess(t.Context(), g.admin, bea.ID, users.AccessChange{Role: ptr(users.RoleMember)}); err != nil {
		t.Fatalf("demote Bea: %v", err)
	}

	// bea still holds the Admin User loaded before her demotion, as a request already in flight would.
	_, err := g.service.ChangeAccess(t.Context(), bea, ana.ID, users.AccessChange{Role: ptr(users.RoleAdmin)})

	if !errors.Is(err, users.ErrForbidden) {
		t.Fatalf("error = %v, want ErrForbidden", err)
	}
}

func TestCard4_AServiceInsideACallersTransactionChangesAccessInIt(t *testing.T) {
	g := newGroup(t)
	ana := g.add(t, "Ana", users.RoleMember)

	err := pgx.BeginFunc(t.Context(), g.pool, func(tx pgx.Tx) error {
		_, err := g.service.WithTx(tx).ChangeAccess(t.Context(), g.admin, ana.ID, users.AccessChange{Active: ptr(false)})
		return err
	})

	if err != nil {
		t.Fatalf("ChangeAccess in a transaction: %v", err)
	}
}
