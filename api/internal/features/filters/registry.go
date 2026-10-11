// Package filters is the Catalog's filter registry (Card 6). Each filter lives in its own file, implements Filter
// and registers itself in init(). The registry is the one piece of global state CLAUDE.md allows: it is filled once
// at start-up and only read afterwards.
package filters

import (
	"context"
	"net/url"
	"slices"

	sq "github.com/Masterminds/squirrel"

	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Control is the kind of UI control a filter is drawn with; the web app picks a component per Control.
type Control string

// The controls the web app knows how to draw.
const (
	ControlSearch      Control = "search"
	ControlMultiSelect Control = "multiSelect"
	ControlRange       Control = "challengeRatingRange"
	ControlTags        Control = "tags"
)

// Option is one choice in a filter, with how many Miniatures in the whole Catalog have it.
type Option struct {
	Value string `json:"value"`
	Label string `json:"label"`
	Count int    `json:"count"`
}

// Definition describes a filter to the UI: GET /filters returns these, so controls need no per-filter code.
type Definition struct {
	Key     string  `json:"key"`
	Label   string  `json:"label"`
	Control Control `json:"control"`
	// Parameters are the URL parameters the filter reads, such as crMin and crMax.
	Parameters []string `json:"parameters"`
	// Order places the filter in the rail; lower comes first.
	Order int `json:"-"`
}

// Filter is one Catalog filter: its definition and how it narrows the list query.
type Filter interface {
	Def() Definition
	// Apply narrows query by the filter's URL parameters. Absent parameters leave query unchanged; invalid ones
	// are returned as field errors named after the parameter (Card 6 rule 8).
	Apply(query sq.SelectBuilder, values url.Values) (sq.SelectBuilder, validation.Errors)
}

// optionLister is a Filter whose control lists choices; search and the Challenge Rating range have none.
type optionLister interface {
	// Options returns the filter's choices with whole-Catalog counts.
	Options(ctx context.Context, store Store) ([]Option, error)
}

var registry []Filter

// Register adds a filter. It is called from each filter file's init().
func Register(filter Filter) {
	registry = append(registry, filter)
}

// registered returns the filters in rail order.
func registered() []Filter {
	ordered := slices.Clone(registry)
	slices.SortFunc(ordered, func(a, b Filter) int { return a.Def().Order - b.Def().Order })
	return ordered
}

// nonEmptyValues returns parameter's values without empty ones: "?size=" leaves the size filter unset, the way the web
// app treats it.
func nonEmptyValues(values url.Values, parameter string) []string {
	return slices.DeleteFunc(slices.Clone(values[parameter]), func(value string) bool { return value == "" })
}
