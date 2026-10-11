package filters

import (
	"cmp"
	"context"
	"fmt"
	"net/url"
	"slices"
	"strings"

	sq "github.com/Masterminds/squirrel"
	"github.com/google/uuid"

	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

func init() { Register(ownerFilter{}) }

// ownerFilter matches Miniatures owned by any of the chosen Users, by id. A deactivated Owner still works, because
// their Miniatures stay theirs (Card 4 rule 7, Card 6 edge case).
type ownerFilter struct{}

func (ownerFilter) Def() Definition {
	return Definition{Key: "owner", Label: "Owner", Control: ControlMultiSelect, Parameters: []string{"owner"}, Order: 40}
}

func (ownerFilter) Apply(query sq.SelectBuilder, values url.Values) (sq.SelectBuilder, validation.Errors) {
	selected := nonEmptyValues(values, "owner")
	if len(selected) == 0 {
		return query, nil
	}
	ownerIDs := make([]uuid.UUID, 0, len(selected))
	for _, text := range selected {
		ownerID, err := uuid.Parse(text)
		if err != nil {
			return query, validation.Errors{{Field: "owner", Message: "Pick owners from the list."}}
		}
		ownerIDs = append(ownerIDs, ownerID)
	}
	return query.Where(sq.Eq{"owner_id": ownerIDs}), nil
}

// Options lists every User who owns at least one Miniature, deactivated or not, A to Z ignoring case, with how many
// they own.
func (ownerFilter) Options(ctx context.Context, store Store) ([]Option, error) {
	rows, err := store.queries.CountMiniaturesByOwner(ctx)
	if err != nil {
		return nil, fmt.Errorf("count owners: %w", err)
	}
	counts := make(map[uuid.UUID]int, len(rows))
	ownerIDs := make([]uuid.UUID, len(rows))
	for i, row := range rows {
		counts[row.OwnerID] = int(row.Count)
		ownerIDs[i] = row.OwnerID
	}
	owners, err := store.owners.FindByIDs(ctx, ownerIDs)
	if err != nil {
		return nil, fmt.Errorf("find owners: %w", err)
	}
	options := make([]Option, 0, len(owners))
	for ownerID, owner := range owners {
		options = append(options, Option{Value: ownerID.String(), Label: owner.DisplayName, Count: counts[ownerID]})
	}
	slices.SortFunc(options, func(a, b Option) int {
		return cmp.Or(cmp.Compare(strings.ToLower(a.Label), strings.ToLower(b.Label)), cmp.Compare(a.Value, b.Value))
	})
	return options, nil
}
