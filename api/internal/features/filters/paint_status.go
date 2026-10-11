package filters

import "context"

func init() {
	Register(choiceFilter{
		definition: Definition{Key: "paintStatus", Label: "Paint status", Control: ControlMultiSelect, Parameters: []string{"paintStatus"}, Order: 50},
		column:     "paint_status",
		choices:    []choice{{"unpainted", "Unpainted"}, {"pre_painted", "Pre-painted"}, {"hand_painted", "Hand-painted"}},
		message:    "Pick paint statuses from the list.",
		count: func(ctx context.Context, queries *Queries) (map[string]int, error) {
			rows, err := queries.CountMiniaturesByPaintStatus(ctx)
			return countsByValue(rows), err
		},
	})
}
