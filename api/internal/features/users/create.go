package users

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Display name limits from Card 3 ("Name must be 2 to 40 characters."), counted in characters.
const (
	MinDisplayNameCharacters = 2
	MaxDisplayNameCharacters = 40
)

// Messages from Cards 1 and 3.
const (
	displayNameLengthMessage = "Name must be 2 to 40 characters."
	displayNameTakenMessage  = "Someone in the group already uses this name."
	passwordLengthMessage    = "Password must be 8 to 72 characters."
)

// uniqueViolation is Postgres's error code for a broken unique index.
const uniqueViolation = "23505"

// displayNameIndex is migration 00003's unique index on lower(display_name) (Card 3 rule 5).
const displayNameIndex = "users_display_name_lower_idx"

// NewUser is a User made from an accepted Invite: the Invite's email and Role, the invitee's name and password.
type NewUser struct {
	Email       string
	Password    string
	DisplayName string
	Role        Role
}

// Create adds an active User. It returns ErrEmailTaken when the email belongs to a User, and field errors for a
// name or password outside Card 1's limits or a name already in use (Card 3 rule 5).
func (s *Service) Create(ctx context.Context, newUser NewUser) (User, error) {
	newUser.DisplayName = strings.TrimSpace(newUser.DisplayName)
	problems := displayNameProblems(newUser.DisplayName)
	problems = append(problems, PasswordProblems("password", newUser.Password)...)
	if err := problems.OrNil(); err != nil {
		return User{}, err
	}
	id, err := uuid.NewV7()
	if err != nil {
		return User{}, fmt.Errorf("new user id: %w", err)
	}
	passwordHash, err := auth.HashPassword(newUser.Password)
	if err != nil {
		return User{}, fmt.Errorf("hash password: %w", err)
	}
	row, err := s.queries.CreateUserIfEmailIsFree(ctx, CreateUserIfEmailIsFreeParams{
		ID:           id,
		Email:        newUser.Email,
		PasswordHash: passwordHash,
		DisplayName:  newUser.DisplayName,
		Role:         userRole(newUser.Role),
	})
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return User{}, ErrEmailTaken
	case isDisplayNameTaken(err):
		return User{}, validation.Errors{{Field: "displayName", Message: displayNameTakenMessage}}
	case err != nil:
		return User{}, fmt.Errorf("create user: %w", err)
	}
	return toUser(row), nil
}

// SetPassword replaces userID's password, after checking Card 1's length limits on field.
func (s *Service) SetPassword(ctx context.Context, userID uuid.UUID, field, password string) error {
	if err := PasswordProblems(field, password).OrNil(); err != nil {
		return err
	}
	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	if err := s.queries.UpdatePasswordHash(ctx, UpdatePasswordHashParams{ID: userID, PasswordHash: passwordHash}); err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

// PasswordProblems checks Card 1's password limits, counted in characters, and names field in the error.
func PasswordProblems(field, password string) validation.Errors {
	if length := utf8.RuneCountInString(password); length < MinPasswordCharacters || length > MaxPasswordCharacters {
		return validation.Errors{{Field: field, Message: passwordLengthMessage}}
	}
	return nil
}

// displayNameProblems checks Card 3's name length. Uniqueness is checked by the database index.
func displayNameProblems(displayName string) validation.Errors {
	if length := utf8.RuneCountInString(displayName); length < MinDisplayNameCharacters || length > MaxDisplayNameCharacters {
		return validation.Errors{{Field: "displayName", Message: displayNameLengthMessage}}
	}
	return nil
}

// isDisplayNameTaken reports whether err is the unique display name index refusing a write.
func isDisplayNameTaken(err error) bool {
	var postgresErr *pgconn.PgError
	return errors.As(err, &postgresErr) && postgresErr.Code == uniqueViolation && postgresErr.ConstraintName == displayNameIndex
}
