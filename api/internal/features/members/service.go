// Package members is the Admin's Members page (Card 4): listing Users and changing their Role or active state.
// It joins two features: users holds the rules on Roles, and auth ends a deactivated User's Sessions.
package members

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
)

// sessionEnder ends every Session of a User inside a transaction; auth.Service is the real one.
type sessionEnder interface {
	EndAllSessions(ctx context.Context, tx pgx.Tx, userID uuid.UUID) error
}

// Service holds the Members page actions.
type Service struct {
	pool     *pgxpool.Pool
	users    *users.Service
	sessions sessionEnder
}

// NewService returns a Service; pool runs the transaction that joins a deactivation and its Sessions ending.
func NewService(pool *pgxpool.Pool, userService *users.Service, sessions sessionEnder) *Service {
	return &Service{pool: pool, users: userService, sessions: sessions}
}

// List returns every User for the Members page. Admins only.
func (s *Service) List(ctx context.Context, actor users.User) ([]users.User, error) {
	return s.users.List(ctx, actor)
}

// Update changes targetID's Role and/or active state (Card 4 rules 5 and 6). Deactivating also ends all their
// Sessions, in the same transaction, so a later Reactivate starts from a fresh login and a failure undoes both
// (Card 4, clarified 2026-10-11).
func (s *Service) Update(ctx context.Context, actor users.User, targetID uuid.UUID, change users.AccessChange) (users.User, error) {
	var changed users.User
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var err error
		changed, err = s.users.WithTx(tx).ChangeAccess(ctx, actor, targetID, change)
		if err != nil {
			return err
		}
		if change.Active != nil && !*change.Active {
			if err := s.sessions.EndAllSessions(ctx, tx, targetID); err != nil {
				return fmt.Errorf("end sessions of deactivated user: %w", err)
			}
		}
		return nil
	})
	if err != nil {
		return users.User{}, err
	}
	return changed, nil
}
