package filters

import (
	"context"
	"fmt"
	"net/url"
	"slices"

	sq "github.com/Masterminds/squirrel"

	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// choice is one fixed value of a choice filter and its label.
type choice struct {
	value string
	label string
}

// choiceFilter is a multi-select over a column with a fixed set of values (creature type, size, paint status).
// Values inside it combine with OR (Card 6 rule 2).
type choiceFilter struct {
	definition Definition
	column     string
	choices    []choice
	message    string
	// count runs the filter's grouped count from queries.sql.
	count func(ctx context.Context, queries *Queries) (map[string]int, error)
}

func (f choiceFilter) Def() Definition { return f.definition }

func (f choiceFilter) Apply(query sq.SelectBuilder, values url.Values) (sq.SelectBuilder, validation.Errors) {
	parameter := f.definition.Parameters[0]
	selected := nonEmptyValues(values, parameter)
	if len(selected) == 0 {
		return query, nil
	}
	for _, value := range selected {
		if !slices.ContainsFunc(f.choices, func(c choice) bool { return c.value == value }) {
			return query, validation.Errors{{Field: parameter, Message: f.message}}
		}
	}
	// The column is an enum; comparing it as text keeps squirrel's IN list simple.
	return query.Where(sq.Eq{f.column + "::text": selected}), nil
}

// Options counts every choice in the whole Catalog, in the choices' own order, including those with no Miniatures.
func (f choiceFilter) Options(ctx context.Context, store Store) ([]Option, error) {
	counts, err := f.count(ctx, store.queries)
	if err != nil {
		return nil, fmt.Errorf("count %s: %w", f.definition.Key, err)
	}
	options := make([]Option, len(f.choices))
	for i, c := range f.choices {
		options[i] = Option{Value: c.value, Label: c.label, Count: counts[c.value]}
	}
	return options, nil
}

// valueCount is one row of a grouped count: a value and how many Miniatures have it.
type valueCount struct {
	Value string
	Count int64
}

// valueCountRow is every sqlc row type shaped like valueCount; sqlc writes one type per query.
type valueCountRow interface {
	CountMiniaturesByCreatureTypeRow | CountMiniaturesBySizeRow | CountMiniaturesByPaintStatusRow | CountTagsInUseRow
}

// countsByValue indexes grouped count rows by their value.
func countsByValue[Row valueCountRow](rows []Row) map[string]int {
	counts := make(map[string]int, len(rows))
	for _, row := range rows {
		counted := valueCount(row)
		counts[counted.Value] = int(counted.Count)
	}
	return counts
}
