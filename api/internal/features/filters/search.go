package filters

import (
	"net/url"
	"strings"

	sq "github.com/Masterminds/squirrel"

	"github.com/BarbieriM/MiniManager/api/internal/platform/textsearch"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

func init() { Register(searchFilter{}) }

// likeEscaper makes LIKE's wildcards and its escape character plain text, so a search for "%" finds a "%"
// (Card 6 edge case).
var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

// searchFilter finds Miniatures whose name contains q, ignoring case and accents (Card 6 rule 4). It compares folded
// text with name_search, which the trigram index serves.
type searchFilter struct{}

func (searchFilter) Def() Definition {
	return Definition{Key: "q", Label: "Search", Control: ControlSearch, Parameters: []string{"q"}, Order: 0}
}

func (searchFilter) Apply(query sq.SelectBuilder, values url.Values) (sq.SelectBuilder, validation.Errors) {
	text := textsearch.Fold(strings.TrimSpace(values.Get("q")))
	if text == "" {
		return query, nil
	}
	return query.Where(sq.Expr(`name_search LIKE '%' || ? || '%' ESCAPE '\'`, likeEscaper.Replace(text))), nil
}
