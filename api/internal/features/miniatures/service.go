// Package miniatures holds the Catalog (Card 5): adding, listing, showing, editing and deleting Miniatures, with
// who may change them decided by features/users/policy.go (Card 4).
package miniatures

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// ErrNotFound means the Miniature does not exist, or no longer does.
var ErrNotFound = errors.New("miniature not found")

// ErrForbidden means the User may not make this change (Card 4 rules 3 and 4).
var ErrForbidden = errors.New("not allowed to change this miniature")

// ErrVersionConflict means someone saved the Miniature after the version the update was based on (Card 5 rule 7).
var ErrVersionConflict = errors.New("miniature was changed by someone else")

// Service holds the Card 5 rules.
type Service struct {
	pool    *pgxpool.Pool
	queries *Queries
	users   *users.Service
	now     func() time.Time
}

// NewService returns a Service. now is time.Now in production and a hand-moved clock in tests.
func NewService(pool *pgxpool.Pool, userService *users.Service, now func() time.Time) *Service {
	return &Service{pool: pool, queries: New(pool), users: userService, now: now}
}

// Owner is the User a Miniature belongs to, as the Catalog shows them.
type Owner struct {
	ID          uuid.UUID
	DisplayName string
}

// Miniature is one entry in the Catalog. CanChange says whether the User who asked may edit or delete it.
type Miniature struct {
	ID              uuid.UUID
	Owner           Owner
	Name            string
	CreatureType    string
	Size            string
	ChallengeRating *float64
	Quantity        int
	PaintStatus     string
	Tags            []string
	StorageLocation string
	Manufacturer    string
	Notes           string
	Version         int
	CreatedBy       uuid.UUID
	CreatedAt       time.Time
	UpdatedAt       time.Time
	CanChange       bool
}

// Input is what a User sends to add or edit a Miniature. Empty optional fields take Card 5's defaults.
type Input struct {
	Name            string
	OwnerID         *uuid.UUID
	CreatureType    string
	Size            string
	ChallengeRating *float64
	Quantity        *int
	PaintStatus     string
	Tags            []string
	StorageLocation string
	Manufacturer    string
	Notes           string
}

// Create adds a Miniature owned by actor.
func (s *Service) Create(ctx context.Context, actor users.User, input Input) (Miniature, error) {
	input = input.normalized()
	if err := input.validate(); err != nil {
		return Miniature{}, err
	}
	ownerID, err := s.chooseOwner(ctx, actor, actor.ID, input.OwnerID)
	if err != nil {
		return Miniature{}, err
	}
	id, err := uuid.NewV7()
	if err != nil {
		return Miniature{}, fmt.Errorf("new miniature id: %w", err)
	}
	row, err := s.queries.CreateMiniature(ctx, CreateMiniatureParams{
		ID:              id,
		OwnerID:         ownerID,
		CreatedBy:       actor.ID,
		Name:            input.Name,
		NameSearch:      nameSearch(input.Name),
		CreatureType:    CreatureType(input.CreatureType),
		Size:            CreatureSize(input.Size),
		ChallengeRating: input.ChallengeRating,
		Quantity:        int16(*input.Quantity),
		PaintStatus:     PaintStatus(input.PaintStatus),
		Tags:            input.Tags,
		StorageLocation: emptyToNil(input.StorageLocation),
		Manufacturer:    emptyToNil(input.Manufacturer),
		Notes:           emptyToNil(input.Notes),
		CreatedAt:       s.now(),
	})
	if err != nil {
		return Miniature{}, fmt.Errorf("create miniature: %w", err)
	}
	return s.toMiniature(ctx, actor, row)
}

// Update replaces a Miniature's fields, provided version is still the stored one (Card 5 rule 7). The version
// goes up by one; the creator and creation time never change (Card 5 rule 6).
func (s *Service) Update(ctx context.Context, actor users.User, id uuid.UUID, version int, input Input) (Miniature, error) {
	current, err := s.getRow(ctx, id)
	if err != nil {
		return Miniature{}, err
	}
	if !users.CanChangeMiniature(actor, current.OwnerID) {
		return Miniature{}, ErrForbidden
	}
	input = input.normalized()
	if err := input.validate(); err != nil {
		return Miniature{}, err
	}
	ownerID, err := s.chooseOwner(ctx, actor, current.OwnerID, input.OwnerID)
	if err != nil {
		return Miniature{}, err
	}
	row, err := s.queries.UpdateMiniature(ctx, UpdateMiniatureParams{
		ID:              id,
		Version:         int32(version),
		OwnerID:         ownerID,
		Name:            input.Name,
		NameSearch:      nameSearch(input.Name),
		CreatureType:    CreatureType(input.CreatureType),
		Size:            CreatureSize(input.Size),
		ChallengeRating: input.ChallengeRating,
		Quantity:        int16(*input.Quantity),
		PaintStatus:     PaintStatus(input.PaintStatus),
		Tags:            input.Tags,
		StorageLocation: emptyToNil(input.StorageLocation),
		Manufacturer:    emptyToNil(input.Manufacturer),
		Notes:           emptyToNil(input.Notes),
		UpdatedAt:       s.now(),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		// No row matched id and version: either someone saved first or the Miniature is gone.
		if _, err := s.getRow(ctx, id); err != nil {
			return Miniature{}, err
		}
		return Miniature{}, ErrVersionConflict
	}
	if err != nil {
		return Miniature{}, fmt.Errorf("update miniature: %w", err)
	}
	return s.toMiniature(ctx, actor, row)
}

// Delete removes a Miniature for good (Card 5 rule 8). Only its Owner or an Admin may (Card 4).
func (s *Service) Delete(ctx context.Context, actor users.User, id uuid.UUID) error {
	current, err := s.getRow(ctx, id)
	if err != nil {
		return err
	}
	if !users.CanChangeMiniature(actor, current.OwnerID) {
		return ErrForbidden
	}
	deleted, err := s.queries.DeleteMiniature(ctx, id)
	if err != nil {
		return fmt.Errorf("delete miniature: %w", err)
	}
	if deleted == 0 {
		return ErrNotFound // deleted by someone else in the meantime
	}
	return nil
}

// chooseOwner returns the Owner to save: the requested one when actor may choose it, else currentOwner.
// Asking for a different Owner is refused for Members; an Admin must pick an active User.
func (s *Service) chooseOwner(ctx context.Context, actor users.User, currentOwner uuid.UUID, requested *uuid.UUID) (uuid.UUID, error) {
	if requested == nil || *requested == currentOwner {
		return currentOwner, nil
	}
	if !users.CanChooseOwner(actor) {
		return uuid.UUID{}, ErrForbidden
	}
	owner, err := s.users.FindByID(ctx, *requested)
	if errors.Is(err, users.ErrNotFound) || (err == nil && !owner.Active) {
		var problems validation.Errors
		problems.Add("ownerId", "Pick an owner from the list.")
		return uuid.UUID{}, problems
	}
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("find owner: %w", err)
	}
	return owner.ID, nil
}

// Get returns one Miniature, or ErrNotFound.
func (s *Service) Get(ctx context.Context, actor users.User, id uuid.UUID) (Miniature, error) {
	row, err := s.getRow(ctx, id)
	if err != nil {
		return Miniature{}, err
	}
	return s.toMiniature(ctx, actor, row)
}

func (s *Service) getRow(ctx context.Context, id uuid.UUID) (miniatureRow, error) {
	row, err := s.queries.GetMiniature(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return miniatureRow{}, ErrNotFound
	}
	if err != nil {
		return miniatureRow{}, fmt.Errorf("get miniature: %w", err)
	}
	return row, nil
}

func (s *Service) toMiniature(ctx context.Context, actor users.User, row miniatureRow) (Miniature, error) {
	miniatures, err := s.toMiniatures(ctx, actor, []miniatureRow{row})
	if err != nil {
		return Miniature{}, err
	}
	return miniatures[0], nil
}

// toMiniatures turns rows into Miniatures, loading all their Owners in one query.
func (s *Service) toMiniatures(ctx context.Context, actor users.User, rows []miniatureRow) ([]Miniature, error) {
	ownerIDs := make([]uuid.UUID, len(rows))
	for i, row := range rows {
		ownerIDs[i] = row.OwnerID
	}
	owners, err := s.users.FindByIDs(ctx, ownerIDs)
	if err != nil {
		return nil, fmt.Errorf("find owners: %w", err)
	}
	miniatures := make([]Miniature, len(rows))
	for i, row := range rows {
		miniatures[i] = toMiniature(actor, row, owners[row.OwnerID])
	}
	return miniatures, nil
}

func toMiniature(actor users.User, row miniatureRow, owner users.User) Miniature {
	return Miniature{
		ID:              row.ID,
		Owner:           Owner{ID: owner.ID, DisplayName: owner.DisplayName},
		Name:            row.Name,
		CreatureType:    string(row.CreatureType),
		Size:            string(row.Size),
		ChallengeRating: row.ChallengeRating,
		Quantity:        int(row.Quantity),
		PaintStatus:     string(row.PaintStatus),
		Tags:            row.Tags,
		StorageLocation: textOrEmpty(row.StorageLocation),
		Manufacturer:    textOrEmpty(row.Manufacturer),
		Notes:           textOrEmpty(row.Notes),
		Version:         int(row.Version),
		CreatedBy:       row.CreatedBy,
		CreatedAt:       row.CreatedAt,
		UpdatedAt:       row.UpdatedAt,
		CanChange:       users.CanChangeMiniature(actor, row.OwnerID),
	}
}

// emptyToNil stores an empty optional text as NULL.
func emptyToNil(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func textOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
