package filters

import (
	"net/url"
	"regexp"
	"strconv"

	sq "github.com/Masterminds/squirrel"

	"github.com/BarbieriM/MiniManager/api/internal/features/challengerating"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

func init() { Register(challengeRatingFilter{}) }

// challengeRatingFilter keeps Miniatures whose Challenge Rating is within crMin and crMax. A Miniature without a
// Challenge Rating is left out only while either bound is set (Card 6 rule 5): comparisons with NULL are never true.
type challengeRatingFilter struct{}

func (challengeRatingFilter) Def() Definition {
	return Definition{
		Key: "challengeRating", Label: "Challenge Rating", Control: ControlRange, Parameters: []string{"crMin", "crMax"}, Order: 30,
	}
}

func (challengeRatingFilter) Apply(query sq.SelectBuilder, values url.Values) (sq.SelectBuilder, validation.Errors) {
	var problems validation.Errors
	minimum, hasMinimum := readChallengeRating(values, "crMin", &problems)
	maximum, hasMaximum := readChallengeRating(values, "crMax", &problems)
	if hasMinimum && hasMaximum && minimum > maximum {
		problems.Add("crMin", "Minimum CR cannot be higher than maximum CR.")
	}
	if len(problems) > 0 {
		return query, problems
	}
	if hasMinimum {
		query = query.Where(sq.GtOrEq{"challenge_rating": minimum})
	}
	if hasMaximum {
		query = query.Where(sq.LtOrEq{"challenge_rating": maximum})
	}
	return query, nil
}

// decimal is how the web app writes a Challenge Rating: digits with an optional fraction, such as 0.125 or 5.
// ParseFloat alone would also take spellings like 1e1, 0x1p-3 or +5.
var decimal = regexp.MustCompile(`^[0-9]+(\.[0-9]+)?$`)

// readChallengeRating parses one bound. An absent bound is fine; anything but an official value is a problem.
func readChallengeRating(values url.Values, parameter string, problems *validation.Errors) (float64, bool) {
	text := values.Get(parameter)
	if text == "" {
		return 0, false
	}
	rating, err := strconv.ParseFloat(text, 64)
	if !decimal.MatchString(text) || err != nil || !challengerating.IsOfficial(rating) {
		problems.Add(parameter, "Pick a valid Challenge Rating.")
		return 0, false
	}
	return rating, true
}
