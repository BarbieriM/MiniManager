package miniatures

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/url"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Sort is one of the Catalog's orders (Card 6, clarified 2026-10-11): a field, descending when it starts with "-".
type Sort string

// The Catalog's orders. A to Z is the default.
const (
	SortByName                Sort = "name"
	SortByNameDescending      Sort = "-name"
	SortByChallengeRating     Sort = "challengeRating"
	SortByChallengeRatingDesc Sort = "-challengeRating"
	SortOldestFirst           Sort = "createdAt"
	SortNewestFirst           Sort = "-createdAt"
	SortBySize                Sort = "size"
	SortBySizeDescending      Sort = "-size"
)

// orderBy is the ORDER BY for each Sort. Ties end on name and id, so paging is stable; minis without a Challenge
// Rating sort last in both directions.
var orderBy = map[Sort][]string{
	SortByName:                {"name_search", "id"},
	SortByNameDescending:      {"name_search DESC", "id DESC"},
	SortByChallengeRating:     {"challenge_rating ASC NULLS LAST", "name_search", "id"},
	SortByChallengeRatingDesc: {"challenge_rating DESC NULLS LAST", "name_search", "id"},
	SortOldestFirst:           {"created_at", "name_search", "id"},
	SortNewestFirst:           {"created_at DESC", "name_search", "id"},
	SortBySize:                {"size", "name_search", "id"},
	SortBySizeDescending:      {"size DESC", "name_search", "id"},
}

// Paging limits (Card 5 rule 10).
const (
	defaultPageSize = 24
	maxPageSize     = 100
)

// catalogFilters narrows a Catalog query by the URL's filter parameters; filters.Service is the real one.
type catalogFilters interface {
	Apply(query sq.SelectBuilder, values url.Values) (sq.SelectBuilder, error)
}

// ListOptions picks one page of the Catalog. Zero values mean "not given": page 1, 24 per page, A to Z, no filters.
type ListOptions struct {
	Page     int
	PageSize int
	Sort     Sort
	// Filters are the URL's filter parameters (Card 6); the filter registry reads and checks them.
	Filters url.Values
}

// Page is one page of the Catalog. Total counts the Miniatures matching the filters; CatalogTotal counts them all.
type Page struct {
	Items        []Miniature
	Total        int
	CatalogTotal int
	Page         int
	PageSize     int
}

// List returns one page of the Catalog, narrowed by the filters and sorted (Cards 5 and 6). Every User sees every
// Miniature (Card 4 rule 1). Filtering and paging happen in the database (Card 6 rule 9).
func (s *Service) List(ctx context.Context, actor users.User, options ListOptions) (Page, error) {
	options = options.withDefaults()
	problems := options.problems()
	matching, filterErr := s.filters.Apply(sq.Select("*").From("miniatures"), options.Filters)
	if filterErr != nil {
		var filterProblems validation.Errors
		if !errors.As(filterErr, &filterProblems) {
			return Page{}, fmt.Errorf("apply filters: %w", filterErr)
		}
		problems = append(problems, filterProblems...)
	}
	if err := problems.OrNil(); err != nil {
		return Page{}, err
	}

	total, err := s.count(ctx, matching)
	if err != nil {
		return Page{}, err
	}
	catalogTotal, err := s.queries.CountMiniatures(ctx)
	if err != nil {
		return Page{}, fmt.Errorf("count the catalog: %w", err)
	}
	rows, err := s.selectRows(ctx, matching.
		OrderBy(orderBy[options.Sort]...).
		Limit(uint64(options.PageSize)).
		Offset(uint64((options.Page-1)*options.PageSize)))
	if err != nil {
		return Page{}, err
	}
	items, err := s.toMiniatures(ctx, actor, rows)
	if err != nil {
		return Page{}, err
	}
	return Page{Items: items, Total: total, CatalogTotal: int(catalogTotal), Page: options.Page, PageSize: options.PageSize}, nil
}

// count runs the filtered query as a count, ignoring its columns.
func (s *Service) count(ctx context.Context, matching sq.SelectBuilder) (int, error) {
	sql, args, err := sq.Select("count(*)").FromSelect(matching, "matching").PlaceholderFormat(sq.Dollar).ToSql()
	if err != nil {
		return 0, fmt.Errorf("build count: %w", err)
	}
	var total int
	if err := s.pool.QueryRow(ctx, sql, args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("count miniatures: %w", err)
	}
	return total, nil
}

func (s *Service) selectRows(ctx context.Context, query sq.SelectBuilder) ([]miniatureRow, error) {
	sql, args, err := query.PlaceholderFormat(sq.Dollar).ToSql()
	if err != nil {
		return nil, fmt.Errorf("build list: %w", err)
	}
	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("list miniatures: %w", err)
	}
	// RowToStructByName matches columns to the row type's db tags.
	list, err := pgx.CollectRows(rows, pgx.RowToStructByName[miniatureRow])
	if err != nil {
		return nil, fmt.Errorf("read miniatures: %w", err)
	}
	return list, nil
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

// problems checks paging and sort (Card 5 rule 10). A page so far out that its offset would not fit the
// database's 32-bit integer is refused like any other invalid page.
func (options ListOptions) problems() validation.Errors {
	var problems validation.Errors
	offset := (int64(options.Page) - 1) * int64(options.PageSize)
	if options.Page < 1 || offset > math.MaxInt32 {
		problems.Add("page", "Page must be a whole number from 1.")
	}
	if options.PageSize < 1 || options.PageSize > maxPageSize {
		problems.Add("pageSize", "Page size must be a whole number from 1 to 100.")
	}
	if _, ok := orderBy[options.Sort]; !ok {
		problems.Add("sort", "Sort must be name, challengeRating, createdAt or size, with an optional leading -.")
	}
	return problems
}
