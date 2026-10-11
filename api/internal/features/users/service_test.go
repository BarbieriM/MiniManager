package users_test

import (
	"errors"
	"slices"
	"strings"
	"testing"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

func TestCard1_Rule7_SeedCreatesTheFirstAdmin(t *testing.T) {
	service := users.NewService(dbtest.NewDatabase(t))

	created, err := service.CreateAdmin(t.Context(), users.NewAdmin{
		Email:       "Mateus@Example.com",
		Password:    "correct horse",
		DisplayName: "Mateus",
	})
	if err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	if !created {
		t.Fatal("CreateAdmin reported the Admin as already existing")
	}

	admin, err := service.FindByEmail(t.Context(), "mateus@example.com")
	if err != nil {
		t.Fatalf("FindByEmail: %v", err)
	}
	if admin.Role != users.RoleAdmin || !admin.Active || admin.DisplayName != "Mateus" {
		t.Errorf("got role %q, active %v, name %q; want an active Admin named Mateus", admin.Role, admin.Active, admin.DisplayName)
	}
}

func TestCard1_Rule7_SeedDoesNothingWhenTheEmailExists(t *testing.T) {
	service := users.NewService(dbtest.NewDatabase(t))
	first := users.NewAdmin{Email: "mateus@example.com", Password: "correct horse", DisplayName: "Mateus"}
	if _, err := service.CreateAdmin(t.Context(), first); err != nil {
		t.Fatalf("first CreateAdmin: %v", err)
	}
	before, err := service.FindLoginRecord(t.Context(), "mateus@example.com")
	if err != nil {
		t.Fatalf("FindByEmail: %v", err)
	}

	created, err := service.CreateAdmin(t.Context(), users.NewAdmin{
		Email: "MATEUS@example.com", Password: "a different password", DisplayName: "Someone Else",
	})
	if err != nil {
		t.Fatalf("second CreateAdmin: %v", err)
	}
	if created {
		t.Error("second CreateAdmin reported a new Admin for an existing email")
	}
	after, err := service.FindLoginRecord(t.Context(), "mateus@example.com")
	if err != nil {
		t.Fatalf("FindLoginRecord: %v", err)
	}
	if after.PasswordHash != before.PasswordHash || after.User.DisplayName != before.User.DisplayName {
		t.Error("second CreateAdmin changed the existing User")
	}
}

func TestCard1_SeedRejectsInputOutsideTheSignUpLimits(t *testing.T) {
	valid := users.NewAdmin{Email: "mateus@example.com", Password: "correct horse", DisplayName: "Mateus"}
	tests := []struct {
		name  string
		edit  func(*users.NewAdmin)
		field string
	}{
		{"email without @", func(a *users.NewAdmin) { a.Email = "mateus.example.com" }, "email"},
		{"password of 7 characters", func(a *users.NewAdmin) { a.Password = "1234567" }, "password"},
		{"password of 73 characters", func(a *users.NewAdmin) { a.Password = strings.Repeat("a", 73) }, "password"},
		{"name of 1 character", func(a *users.NewAdmin) { a.DisplayName = "M" }, "displayName"},
		{"name of 41 characters", func(a *users.NewAdmin) { a.DisplayName = strings.Repeat("a", 41) }, "displayName"},
	}
	service := users.NewService(dbtest.NewDatabase(t))
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			admin := valid
			test.edit(&admin)

			_, err := service.CreateAdmin(t.Context(), admin)

			var invalid validation.Errors
			if !errors.As(err, &invalid) || !invalid.Has(test.field) {
				t.Fatalf("CreateAdmin error = %v, want a validation error on %s", err, test.field)
			}
		})
	}
	if _, err := service.FindByEmail(t.Context(), "mateus@example.com"); !errors.Is(err, users.ErrNotFound) {
		t.Errorf("an invalid seed created a User (FindByEmail error = %v)", err)
	}
}

func TestCard1_SeedAcceptsTheLimitsThemselves(t *testing.T) {
	service := users.NewService(dbtest.NewDatabase(t))

	created, err := service.CreateAdmin(t.Context(), users.NewAdmin{
		Email: "mateus@example.com", Password: strings.Repeat("é", 72), DisplayName: "Mo",
	})
	if err != nil || !created {
		t.Fatalf("CreateAdmin = %v, %v; want a created Admin at the 72-character and 2-character limits", created, err)
	}
}

func TestCard4_Rule4_OwnerOptionsListActiveUsersByName(t *testing.T) {
	pool := dbtest.NewDatabase(t)
	service := users.NewService(pool)
	if _, err := service.CreateAdmin(t.Context(), users.NewAdmin{Email: "mateus@example.com", Password: "correct horse", DisplayName: "Mateus"}); err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	for _, name := range []string{"Rafa", "Ana"} {
		if _, err := pool.Exec(t.Context(),
			"INSERT INTO users (id, email, password_hash, display_name, role, active) VALUES (gen_random_uuid(), $1, 'x', $2, 'member', $3)",
			strings.ToLower(name)+"@example.com", name, name != "Rafa"); err != nil {
			t.Fatalf("insert %s: %v", name, err)
		}
	}

	options, err := service.ListActive(t.Context())

	if err != nil {
		t.Fatalf("ListActive: %v", err)
	}
	var names []string
	for _, user := range options {
		names = append(names, user.DisplayName)
	}
	if want := []string{"Ana", "Mateus"}; !slices.Equal(names, want) {
		t.Errorf("names = %q, want %q (Rafa is deactivated)", names, want)
	}
}
