package filters

import "context"

func init() {
	Register(choiceFilter{
		definition: Definition{Key: "size", Label: "Size", Control: ControlMultiSelect, Parameters: []string{"size"}, Order: 20},
		column:     "size",
		choices: []choice{
			{"tiny", "Tiny"}, {"small", "Small"}, {"medium", "Medium"},
			{"large", "Large"}, {"huge", "Huge"}, {"gargantuan", "Gargantuan"},
		},
		message: "Pick sizes from the list.",
		count: func(ctx context.Context, queries *Queries) (map[string]int, error) {
			rows, err := queries.CountMiniaturesBySize(ctx)
			return countsByValue(rows), err
		},
	})
}
