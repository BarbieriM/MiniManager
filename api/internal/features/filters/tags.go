package filters

import (
	"context"
	"fmt"
	"net/url"

	sq "github.com/Masterminds/squirrel"

	"github.com/BarbieriM/MiniManager/api/internal/features/tags"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

func init() { Register(tagsFilter{}) }

// tagsFilter matches Miniatures sharing any of the chosen tags, or all of them with tagMatch=all (Card 6 rule 3).
// Typed tags are normalized like Card 5 rule 3, so "Faction : Drow" means faction:drow.
type tagsFilter struct{}

func (tagsFilter) Def() Definition {
	return Definition{Key: "tags", Label: "Tags", Control: ControlTags, Parameters: []string{"tags", "tagMatch"}, Order: 60}
}

func (tagsFilter) Apply(query sq.SelectBuilder, values url.Values) (sq.SelectBuilder, validation.Errors) {
	var problems validation.Errors
	match := values.Get("tagMatch")
	if match != "" && match != "any" && match != "all" {
		problems.Add("tagMatch", "Tag match must be any or all.")
	}
	chosen := tags.NormalizeAll(nonEmptyValues(values, "tags"))
	for _, message := range tags.Problems(chosen) {
		problems.Add("tags", message)
	}
	if len(problems) > 0 || len(chosen) == 0 {
		return query, problems
	}
	if match == "all" {
		return query.Where(sq.Expr("tags @> ?::text[]", chosen)), nil // has every chosen tag
	}
	return query.Where(sq.Expr("tags && ?::text[]", chosen)), nil // shares at least one
}

// Options lists the tags in use, most used first, then A to Z. A tag on no Miniature is not listed.
func (tagsFilter) Options(ctx context.Context, store Store) ([]Option, error) {
	return store.tagsInUse(ctx)
}

// tagsInUse lists every tag on at least one Miniature with its count; GET /tags and the tag filter share it.
func (s Store) tagsInUse(ctx context.Context) ([]Option, error) {
	rows, err := s.queries.CountTagsInUse(ctx)
	if err != nil {
		return nil, fmt.Errorf("count tags: %w", err)
	}
	options := make([]Option, len(rows))
	for i, row := range rows {
		options[i] = Option{Value: row.Value, Label: row.Value, Count: int(row.Count)}
	}
	return options, nil
}
