package miniatures

import (
	"context"
	"fmt"
	"math"
	"slices"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Sort is one of the Catalog's orders (Card 5 rule 10). The zero value is not valid; callers pick one.
type Sort string

// The Catalog's orders. A to Z is the default.
const (
	SortByName            Sort = "name"
	SortNewestFirst       Sort = "-createdAt"
	SortByChallengeRating Sort = "challengeRating"
	SortBySize            Sort = "size"
)

// sorts lists every valid Sort, in one place for validation.
var sorts = []Sort{SortByName, SortNewestFirst, SortByChallengeRating, SortBySize}

// Paging limits (Card 5 rule 10).
const (
	defaultPageSize = 24
	maxPageSize     = 100
)

// ListOptions picks one page of the Catalog. Page starts at 1. Zero values mean "not given": page 1, 24 per page,
// A to Z.
type ListOptions struct {
	Page     int
	PageSize int
	Sort     Sort
}

// Page is one page of the Catalog plus how many Miniatures there are in all.
type Page struct {
	Items    []Miniature
	Total    int
	Page     int
	PageSize int
}

// List returns one page of the Catalog. Every User sees every Miniature (Card 4 rule 1).
func (s *Service) List(ctx context.Context, actor users.User, options ListOptions) (Page, error) {
	options = options.withDefaults()
	if err := options.validate(); err != nil {
		return Page{}, err
	}
	total, err := s.queries.CountMiniatures(ctx)
	if err != nil {
		return Page{}, fmt.Errorf("count miniatures: %w", err)
	}
	rows, err := s.listRows(ctx, options)
	if err != nil {
		return Page{}, fmt.Errorf("list miniatures: %w", err)
	}
	items, err := s.toMiniatures(ctx, actor, rows)
	if err != nil {
		return Page{}, err
	}
	return Page{Items: items, Total: int(total), Page: options.Page, PageSize: options.PageSize}, nil
}

// listRows runs the query for options.Sort. Every query uses the same limit and offset.
func (s *Service) listRows(ctx context.Context, options ListOptions) ([]miniatureRow, error) {
	limit, offset := int32(options.PageSize), int32((options.Page-1)*options.PageSize)
	switch options.Sort {
	case SortByName:
		return s.queries.ListMiniaturesByName(ctx, ListMiniaturesByNameParams{Limit: limit, Offset: offset})
	case SortNewestFirst:
		return s.queries.ListMiniaturesNewestFirst(ctx, ListMiniaturesNewestFirstParams{Limit: limit, Offset: offset})
	case SortByChallengeRating:
		return s.queries.ListMiniaturesByChallengeRating(ctx, ListMiniaturesByChallengeRatingParams{Limit: limit, Offset: offset})
	case SortBySize:
		return s.queries.ListMiniaturesBySize(ctx, ListMiniaturesBySizeParams{Limit: limit, Offset: offset})
	}
	return nil, fmt.Errorf("unknown sort %q", options.Sort)
}

func (options ListOptions) withDefaults() ListOptions {
	if options.Page == 0 {
		options.Page = 1
	}
	if options.PageSize == 0 {
		options.PageSize = defaultPageSize
	}
	if options.Sort == "" {
		options.Sort = SortByName
	}
	return options
}

// validate checks paging and sort (Card 5 rule 10). A page so far out that its offset would not fit the
// database's 32-bit integer is refused like any other invalid page.
func (options ListOptions) validate() error {
	var problems validation.Errors
	offset := (int64(options.Page) - 1) * int64(options.PageSize)
	if options.Page < 1 || offset > math.MaxInt32 {
		problems.Add("page", "Page must be a whole number from 1.")
	}
	if options.PageSize < 1 || options.PageSize > maxPageSize {
		problems.Add("pageSize", "Page size must be a whole number from 1 to 100.")
	}
	if !slices.Contains(sorts, options.Sort) {
		problems.Add("sort", "Sort must be name, -createdAt, challengeRating or size.")
	}
	return problems.OrNil()
}
