package filters

import "context"

func init() {
	Register(choiceFilter{
		definition: Definition{Key: "creatureType", Label: "Type", Control: ControlMultiSelect, Parameters: []string{"creatureType"}, Order: 10},
		column:     "creature_type",
		choices: []choice{
			{"aberration", "Aberration"}, {"beast", "Beast"}, {"celestial", "Celestial"}, {"construct", "Construct"},
			{"dragon", "Dragon"}, {"elemental", "Elemental"}, {"fey", "Fey"}, {"fiend", "Fiend"}, {"giant", "Giant"},
			{"humanoid", "Humanoid"}, {"monstrosity", "Monstrosity"}, {"ooze", "Ooze"}, {"plant", "Plant"},
			{"undead", "Undead"},
		},
		message: "Pick creature types from the list.",
		count: func(ctx context.Context, queries *Queries) (map[string]int, error) {
			rows, err := queries.CountMiniaturesByCreatureType(ctx)
			return countsByValue(rows), err
		},
	})
}
