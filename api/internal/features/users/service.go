// Package users holds Users: lookup for login, the first Admin (Card 1 rule 7), and later profile and roles
// (Cards 3 and 4).
package users

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Password limits from Card 1 ("Password must be 8 to 72 characters."), counted in characters, not bytes.
const (
	MinPasswordCharacters = 8
	MaxPasswordCharacters = 72
)

// ErrNotFound means no User matches.
var ErrNotFound = errors.New("user not found")

// Role is what a User may do (see GLOSSARY.md).
type Role string

// The only Roles.
const (
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
)

// User is a Player's account, as other features see it.
type User struct {
	ID          uuid.UUID
	Email       string
	DisplayName string
	Role        Role
	Active      bool
}

// LoginRecord is a User plus the password hash, which only login needs.
type LoginRecord struct {
	User         User
	PasswordHash string
}

// Service holds the business rules for Users.
type Service struct {
	queries *Queries
}

// NewService returns a Service that stores Users in pool.
func NewService(pool *pgxpool.Pool) *Service {
	return &Service{queries: New(pool)}
}

// NewAdmin is the input for CreateAdmin.
type NewAdmin struct {
	Email       string
	Password    string
	DisplayName string
}

// CreateAdmin creates an active Admin, unless a User already has that email. It never changes an existing User,
// so running the seed twice is safe. created is false when the email was taken.
func (s *Service) CreateAdmin(ctx context.Context, admin NewAdmin) (created bool, err error) {
	if err := admin.validate(); err != nil {
		return false, err
	}
	id, err := uuid.NewV7()
	if err != nil {
		return false, fmt.Errorf("new user id: %w", err)
	}
	passwordHash, err := auth.HashPassword(admin.Password)
	if err != nil {
		return false, fmt.Errorf("hash password: %w", err)
	}
	_, err = s.queries.CreateUserIfEmailIsFree(ctx, CreateUserIfEmailIsFreeParams{
		ID:           id,
		Email:        admin.Email,
		PasswordHash: passwordHash,
		DisplayName:  admin.DisplayName,
		Role:         userRoleAdmin,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("create admin: %w", err)
	}
	return true, nil
}

// FindByEmail returns the User with that email, compared case-insensitively, or ErrNotFound.
func (s *Service) FindByEmail(ctx context.Context, email string) (User, error) {
	record, err := s.FindLoginRecord(ctx, email)
	return record.User, err
}

// FindLoginRecord returns the User with that email and their password hash, or ErrNotFound.
func (s *Service) FindLoginRecord(ctx context.Context, email string) (LoginRecord, error) {
	row, err := found(s.queries.GetUserByEmail(ctx, email))
	if err != nil {
		return LoginRecord{}, fmt.Errorf("find user by email: %w", err)
	}
	return LoginRecord{User: toUser(row), PasswordHash: row.PasswordHash}, nil
}

// FindByID returns the User with that id, or ErrNotFound.
func (s *Service) FindByID(ctx context.Context, id uuid.UUID) (User, error) {
	row, err := found(s.queries.GetUserByID(ctx, id))
	if err != nil {
		return User{}, fmt.Errorf("find user by id: %w", err)
	}
	return toUser(row), nil
}

// FindByIDs returns the Users with those ids, keyed by id, in one query. Unknown ids are left out.
func (s *Service) FindByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]User, error) {
	rows, err := s.queries.GetUsersByIDs(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("find users by ids: %w", err)
	}
	found := make(map[uuid.UUID]User, len(rows))
	for _, row := range rows {
		found[row.ID] = toUser(row)
	}
	return found, nil
}

// ListActive returns every active User, A to Z, for the Admin's owner picker (Card 4 rule 4).
func (s *Service) ListActive(ctx context.Context) ([]User, error) {
	rows, err := s.queries.ListActiveUsers(ctx)
	if err != nil {
		return nil, fmt.Errorf("list active users: %w", err)
	}
	active := make([]User, len(rows))
	for i, row := range rows {
		active[i] = toUser(row)
	}
	return active, nil
}

// found turns pgx's "no rows" into ErrNotFound.
func found(row userRow, err error) (userRow, error) {
	if errors.Is(err, pgx.ErrNoRows) {
		return userRow{}, ErrNotFound
	}
	return row, err
}

func toUser(row userRow) User {
	return User{ID: row.ID, Email: row.Email, DisplayName: row.DisplayName, Role: Role(row.Role), Active: row.Active}
}

// validate applies Card 1's sign-up limits, so the seeded Admin follows the same rules as invited Users.
func (admin NewAdmin) validate() error {
	var problems validation.Errors
	if address, err := mail.ParseAddress(admin.Email); err != nil || address.Address != admin.Email {
		problems.Add("email", "Enter a valid email address.")
	}
	if length := utf8.RuneCountInString(admin.Password); length < MinPasswordCharacters || length > MaxPasswordCharacters {
		problems.Add("password", "Password must be 8 to 72 characters.")
	}
	if length := utf8.RuneCountInString(admin.DisplayName); length < 2 || length > 40 {
		problems.Add("displayName", "Display name must be 2 to 40 characters.")
	}
	return problems.OrNil()
}
