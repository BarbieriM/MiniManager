package users

import (
	"context"
	"fmt"
	"strings"

	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Profile is what a User may change about themself (Card 3). Email is not editable in the MVP (rule 4); the
// password is changed through the auth feature, which owns Sessions (rule 3).
type Profile struct {
	DisplayName string
}

// UpdateProfile saves actor's own profile (Card 3 rule 1: there is no way to name another User). Saving the same
// name again succeeds.
func (s *Service) UpdateProfile(ctx context.Context, actor User, profile Profile) (User, error) {
	displayName := strings.TrimSpace(profile.DisplayName)
	if err := displayNameProblems(displayName).OrNil(); err != nil {
		return User{}, err
	}
	row, err := s.queries.UpdateDisplayName(ctx, UpdateDisplayNameParams{ID: actor.ID, DisplayName: displayName})
	if isDisplayNameTaken(err) {
		return User{}, validation.Errors{{Field: "displayName", Message: displayNameTakenMessage}}
	}
	if err != nil {
		return User{}, fmt.Errorf("update display name: %w", err)
	}
	return toUser(row), nil
}
