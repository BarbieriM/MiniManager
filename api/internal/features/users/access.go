package users

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Errors from the Admin's role and active changes (Card 4).
var (
	// ErrForbidden means the actor is not allowed to do this (Card 4 rule 5).
	ErrForbidden = errors.New("not allowed")
	// ErrLastAdmin means the change would leave no active Admin (Card 4 rule 6).
	ErrLastAdmin = errors.New("there must be at least one admin")
	// ErrDeactivateSelf means an Admin tried to deactivate themself (Card 4, clarified 2026-10-11).
	ErrDeactivateSelf = errors.New("cannot deactivate yourself")
)

// AccessChange is an Admin's change to a User's Role, active state, or both. A nil field is left as it is.
type AccessChange struct {
	Role   *Role
	Active *bool
}

// List returns every User for the Members page: active ones A to Z, then deactivated ones. Admins only.
func (s *Service) List(ctx context.Context, actor User) ([]User, error) {
	if !CanManageUsers(actor) {
		return nil, ErrForbidden
	}
	rows, err := s.queries.ListUsers(ctx)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	listed := make([]User, len(rows))
	for i, row := range rows {
		listed[i] = toUser(row)
	}
	return listed, nil
}

// ChangeAccess changes targetID's Role and/or active state (Card 4 rules 5 and 6). It runs in a transaction (its
// own, or the caller's when s came from WithTx) that first locks every active Admin, so neither the count it checks
// nor the actor's own Role can change before it writes. The actor is read again inside the lock: an Admin demoted
// by a request that finished first can no longer make changes.
func (s *Service) ChangeAccess(ctx context.Context, actor User, targetID uuid.UUID, change AccessChange) (User, error) {
	if !CanManageUsers(actor) {
		return User{}, ErrForbidden
	}
	if change.Role != nil && !change.Role.Valid() {
		return User{}, validation.Errors{{Field: "role", Message: "Pick admin or member."}}
	}
	if change.Active != nil && !*change.Active && !CanDeactivate(actor, targetID) {
		return User{}, ErrDeactivateSelf
	}
	var changed User
	err := s.inTransaction(ctx, func(queries *Queries) error {
		activeAdmins, err := queries.LockActiveAdmins(ctx)
		if err != nil {
			return fmt.Errorf("lock admins: %w", err)
		}
		current, err := found(queries.GetUserByID(ctx, actor.ID))
		if err != nil {
			return fmt.Errorf("find actor: %w", err)
		}
		if !CanManageUsers(toUser(current)) {
			return ErrForbidden
		}
		target, err := found(queries.GetUserByID(ctx, targetID))
		if err != nil {
			return fmt.Errorf("find user: %w", err)
		}
		role, active := Role(target.Role), target.Active
		if change.Role != nil {
			role = *change.Role
		}
		if change.Active != nil {
			active = *change.Active
		}
		wasActiveAdmin := Role(target.Role) == RoleAdmin && target.Active
		staysActiveAdmin := role == RoleAdmin && active
		if wasActiveAdmin && !staysActiveAdmin && len(activeAdmins) <= 1 {
			return ErrLastAdmin
		}
		row, err := queries.UpdateAccess(ctx, UpdateAccessParams{ID: targetID, Role: userRole(role), Active: active})
		if err != nil {
			return fmt.Errorf("update access: %w", err)
		}
		changed = toUser(row)
		return nil
	})
	if err != nil {
		return User{}, err
	}
	return changed, nil
}
