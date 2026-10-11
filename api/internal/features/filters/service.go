package filters

import (
	"context"
	"fmt"
	"net/url"

	sq "github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// ownerFinder finds Users by id, to name the Owners in the owner filter; users.Service is the real one.
type ownerFinder interface {
	FindByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]users.User, error)
}

// Store is what filters need to compute their options: the counts in queries.sql, and Owner names.
type Store struct {
	queries *Queries
	owners  ownerFinder
}

// Service applies the registered filters to the Catalog and describes them to the UI.
type Service struct {
	store Store
}

// NewService returns a Service over pool; owners names the Owners in the owner filter.
func NewService(pool *pgxpool.Pool, owners ownerFinder) *Service {
	return &Service{store: Store{queries: New(pool), owners: owners}}
}

// Apply narrows query by every registered filter (different filters combine with AND, Card 6 rule 1). Parameters no
// filter knows are ignored (Card 6 rule 8); invalid values for known ones are returned together as field errors.
func (s *Service) Apply(query sq.SelectBuilder, values url.Values) (sq.SelectBuilder, error) {
	var problems validation.Errors
	for _, filter := range registered() {
		narrowed, filterProblems := filter.Apply(query, values)
		problems = append(problems, filterProblems...)
		query = narrowed
	}
	if err := problems.OrNil(); err != nil {
		return query, err
	}
	return query, nil
}

// DefinitionWithOptions is a filter as GET /filters describes it: its definition plus its choices, if it has any.
type DefinitionWithOptions struct {
	Definition
	Options []Option `json:"options,omitempty"`
}

// Definitions describes every registered filter in rail order, with whole-Catalog counts for their choices (Card 6
// rule 10: the UI draws its controls from these).
func (s *Service) Definitions(ctx context.Context) ([]DefinitionWithOptions, error) {
	filters := registered()
	definitions := make([]DefinitionWithOptions, len(filters))
	for i, filter := range filters {
		definitions[i] = DefinitionWithOptions{Definition: filter.Def()}
		lister, hasOptions := filter.(optionLister)
		if !hasOptions {
			continue
		}
		options, err := lister.Options(ctx, s.store)
		if err != nil {
			return nil, fmt.Errorf("options for %s: %w", filter.Def().Key, err)
		}
		definitions[i].Options = options
	}
	return definitions, nil
}

// TagsInUse lists every tag on at least one Miniature, most used first, for the form's tag suggestions.
func (s *Service) TagsInUse(ctx context.Context) ([]Option, error) {
	return s.store.tagsInUse(ctx)
}
