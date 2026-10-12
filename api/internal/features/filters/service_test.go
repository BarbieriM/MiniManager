package filters_test

import (
	"errors"
	"net/url"
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/filters"
	"github.com/BarbieriM/MiniManager/api/internal/features/miniatures"
	"github.com/BarbieriM/MiniManager/api/internal/features/photos"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

type fixture struct {
	pool       *pgxpool.Pool
	users      *users.Service
	miniatures *miniatures.Service
	filters    *filters.Service
	admin      users.User
	clock      time.Time
}

// newFixture returns the services over a fresh database holding one Admin and no Miniatures.
func newFixture(t *testing.T) *fixture {
	t.Helper()
	pool := dbtest.NewDatabase(t)
	userService := users.NewService(pool)
	if _, err := userService.CreateAdmin(t.Context(), users.NewAdmin{
		Email: "mateus@example.com", Password: "correct horse", DisplayName: "Mateus",
	}); err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	admin, err := userService.FindByEmail(t.Context(), "mateus@example.com")
	if err != nil {
		t.Fatalf("FindByEmail: %v", err)
	}
	f := &fixture{pool: pool, users: userService, admin: admin, clock: time.Date(2026, 10, 11, 20, 0, 0, 0, time.UTC)}
	f.filters = filters.NewService(pool, userService)
	f.miniatures = miniatures.NewService(pool, userService, f.filters, photos.NewGallery(pool, nil), func() time.Time { return f.clock })
	return f
}

// add saves a Miniature through the real Card 5 rules; edit changes the defaults (a small humanoid named name).
func (f *fixture) add(t *testing.T, name string, edit func(*miniatures.Input)) {
	t.Helper()
	input := miniatures.Input{Name: name, CreatureType: "humanoid", Size: "small"}
	if edit != nil {
		edit(&input)
	}
	if _, err := f.miniatures.Create(t.Context(), f.admin, input); err != nil {
		t.Fatalf("Create %s: %v", name, err)
	}
	f.clock = f.clock.Add(time.Minute)
}

func (f *fixture) addMember(t *testing.T, email, displayName string) users.User {
	t.Helper()
	if _, err := f.pool.Exec(t.Context(),
		"INSERT INTO users (id, email, password_hash, display_name, role) VALUES ($1, $2, 'x', $3, 'member')",
		uuid.Must(uuid.NewV7()), email, displayName); err != nil {
		t.Fatalf("insert member: %v", err)
	}
	user, err := f.users.FindByEmail(t.Context(), email)
	if err != nil {
		t.Fatalf("FindByEmail: %v", err)
	}
	return user
}

// names lists the Catalog for query (a URL query string such as "size=small&size=medium"), A to Z.
func (f *fixture) names(t *testing.T, query string) []string {
	t.Helper()
	values, err := url.ParseQuery(query)
	if err != nil {
		t.Fatalf("parse %q: %v", query, err)
	}
	page, err := f.miniatures.List(t.Context(), f.admin, miniatures.ListOptions{Filters: values})
	if err != nil {
		t.Fatalf("List(%s): %v", query, err)
	}
	names := make([]string, len(page.Items))
	for i, miniature := range page.Items {
		names[i] = miniature.Name
	}
	return names
}

func assertNames(t *testing.T, got []string, want ...string) {
	t.Helper()
	if !slices.Equal(got, want) {
		t.Errorf("names = %q, want %q", got, want)
	}
}

func size(value string) func(*miniatures.Input) {
	return func(input *miniatures.Input) { input.Size = value }
}

func TestCard6_AcceptanceCriterion1_ValuesInsideOneFilterCombineWithOR(t *testing.T) {
	f := newFixture(t)
	f.add(t, "Goblin", size("small"))
	f.add(t, "Hobgoblin", size("medium"))
	f.add(t, "Ogre", size("large"))

	assertNames(t, f.names(t, "size=small&size=medium"), "Goblin", "Hobgoblin")
}

func typeAndTags(creatureType string, tags ...string) func(*miniatures.Input) {
	return func(input *miniatures.Input) {
		input.CreatureType = creatureType
		input.Tags = tags
	}
}

func TestCard6_AcceptanceCriterion2_DifferentFiltersCombineWithAND(t *testing.T) {
	f := newFixture(t)
	f.add(t, "Goblin", typeAndTags("humanoid", "goblinoid"))
	f.add(t, "Guard", typeAndTags("humanoid", "city"))
	f.add(t, "Worg", typeAndTags("monstrosity", "goblinoid"))

	assertNames(t, f.names(t, "creatureType=humanoid&tags=goblinoid"), "Goblin")
}

func TestCard6_Rule3_TagsMatchAnyByDefaultOrAll(t *testing.T) {
	f := newFixture(t)
	f.add(t, "Drow Mage", typeAndTags("humanoid", "faction:drow", "caster"))
	f.add(t, "Drow Warrior", typeAndTags("humanoid", "faction:drow"))
	f.add(t, "Goblin Shaman", typeAndTags("humanoid", "caster"))

	assertNames(t, f.names(t, "tags=faction:drow&tags=caster"), "Drow Mage", "Drow Warrior", "Goblin Shaman")
	assertNames(t, f.names(t, "tags=faction:drow&tags=caster&tagMatch=all"), "Drow Mage")
	// Tags are normalized like Card 5 rule 3, so a typed "Faction : Drow" means faction:drow.
	assertNames(t, f.names(t, "tags=Faction+:+Drow&tagMatch=all"), "Drow Mage", "Drow Warrior")
}

func TestCard6_Rule4_SearchMatchesAnyPartOfTheNameIgnoringCaseAndAccents(t *testing.T) {
	f := newFixture(t)
	for _, name := range []string{"Hobgoblin Captain", "Goblin", "Éttercap", "Ogre"} {
		f.add(t, name, nil)
	}

	assertNames(t, f.names(t, "q=GOB"), "Goblin", "Hobgoblin Captain") // acceptance criterion 5
	assertNames(t, f.names(t, "q=etter"), "Éttercap")
	assertNames(t, f.names(t, "q=TTÉR"), "Éttercap")
}

func TestCard6_SearchTreatsSpecialCharactersAsPlainText(t *testing.T) {
	f := newFixture(t)
	f.add(t, "100% Goblin", nil)
	f.add(t, `Goblin "Boss"`, nil)
	f.add(t, "Goblin_King", nil)
	f.add(t, "Ogre", nil)

	assertNames(t, f.names(t, "q=%25"), "100% Goblin")
	assertNames(t, f.names(t, `q="`), `Goblin "Boss"`)
	assertNames(t, f.names(t, "q=_"), "Goblin_King")
	assertNames(t, f.names(t, `q=\`))
}

func TestCard6_PaintStatusFilter(t *testing.T) {
	f := newFixture(t)
	f.add(t, "Goblin", func(input *miniatures.Input) { input.PaintStatus = "hand_painted" })
	f.add(t, "Ogre", nil)
	f.add(t, "Troll", func(input *miniatures.Input) { input.PaintStatus = "pre_painted" })

	assertNames(t, f.names(t, "paintStatus=hand_painted&paintStatus=pre_painted"), "Goblin", "Troll")
}

func TestCard6_TheOwnerFilterWorksForADeactivatedOwner(t *testing.T) {
	f := newFixture(t)
	ana := f.addMember(t, "ana@example.com", "Ana")
	f.add(t, "Goblin", func(input *miniatures.Input) { input.OwnerID = &ana.ID })
	f.add(t, "Ogre", nil)
	if _, err := f.pool.Exec(t.Context(), "UPDATE users SET active = false WHERE id = $1", ana.ID); err != nil {
		t.Fatalf("deactivate: %v", err)
	}

	assertNames(t, f.names(t, "owner="+ana.ID.String()), "Goblin")
}

func challengeRating(rating float64) func(*miniatures.Input) {
	return func(input *miniatures.Input) { input.ChallengeRating = &rating }
}

func TestCard6_Rule5_TheChallengeRatingRangeLeavesOutUnratedMinisOnlyWhenSet(t *testing.T) {
	f := newFixture(t)
	f.add(t, "Kobold", challengeRating(0.125))
	f.add(t, "Ogre", challengeRating(2))
	f.add(t, "Troll", challengeRating(5))
	f.add(t, "Villager", nil)

	assertNames(t, f.names(t, ""), "Kobold", "Ogre", "Troll", "Villager")
	assertNames(t, f.names(t, "crMin=1&crMax=5"), "Ogre", "Troll")
	assertNames(t, f.names(t, "crMin=0.125"), "Kobold", "Ogre", "Troll")
	assertNames(t, f.names(t, "crMax=1"), "Kobold")
}

func (f *fixture) listErrors(t *testing.T, query string) validation.Errors {
	t.Helper()
	values, err := url.ParseQuery(query)
	if err != nil {
		t.Fatalf("parse %q: %v", query, err)
	}
	_, err = f.miniatures.List(t.Context(), f.admin, miniatures.ListOptions{Filters: values})
	var problems validation.Errors
	if !errors.As(err, &problems) {
		t.Fatalf("List(%s) error = %v, want validation errors", query, err)
	}
	return problems
}

func TestCard6_Rule8_UnknownParametersAreIgnoredAndInvalidValuesAreFieldErrors(t *testing.T) {
	f := newFixture(t)
	f.add(t, "Goblin", nil)

	assertNames(t, f.names(t, "colour=red&minQuantity=2"), "Goblin")
	for query, field := range map[string]string{
		"creatureType=goblinoid": "creatureType",
		"size=colossal":          "size",
		"paintStatus=painted":    "paintStatus",
		"owner=not-an-id":        "owner",
		"crMin=0.3":              "crMin",
		"crMax=thirty":           "crMax",
		"crMin=1e1":              "crMin",
		"crMax=0x1p-3":           "crMax",
		"crMin=+5":               "crMin",
		"tags=goblin!":           "tags",
		"tagMatch=some":          "tagMatch",
	} {
		if problems := f.listErrors(t, query); !problems.Has(field) {
			t.Errorf("%s: errors = %v, want one on %s", query, problems, field)
		}
	}
}

func TestCard6_EmptyValuesLeaveTheirFilterUnset(t *testing.T) {
	f := newFixture(t)
	f.add(t, "Goblin", nil)
	f.add(t, "Ogre", size("large"))

	assertNames(t, f.names(t, "q=&creatureType=&size=&crMin=&crMax=&owner=&paintStatus=&tags=&tagMatch="), "Goblin", "Ogre")
	assertNames(t, f.names(t, "size=&size=large&tags="), "Ogre")
}

func TestCard6_AcceptanceCriterion4_AMinimumAboveTheMaximumIsRefused(t *testing.T) {
	f := newFixture(t)

	problems := f.listErrors(t, "crMin=5&crMax=2")

	if len(problems) != 1 || problems[0].Field != "crMin" || problems[0].Message != "Minimum CR cannot be higher than maximum CR." {
		t.Errorf("errors = %v, want the Card 6 CR message on crMin", problems)
	}
}

func TestCard6_Rule7_TheListCountsMatchesAndTheWholeCatalog(t *testing.T) {
	f := newFixture(t)
	f.add(t, "Goblin", size("small"))
	f.add(t, "Ogre", size("large"))
	f.add(t, "Troll", size("large"))

	page, err := f.miniatures.List(t.Context(), f.admin, miniatures.ListOptions{Filters: url.Values{"size": {"large"}}, PageSize: 1})

	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if page.Total != 2 || page.CatalogTotal != 3 || len(page.Items) != 1 {
		t.Errorf("total %d, catalog total %d, items %d; want 2, 3 and 1", page.Total, page.CatalogTotal, len(page.Items))
	}
}

func TestCard6_DefinitionsListTheFiltersWithWholeCatalogCounts(t *testing.T) {
	f := newFixture(t)
	ana := f.addMember(t, "ana@example.com", "Ana")
	f.add(t, "Goblin", typeAndTags("humanoid", "goblinoid"))
	f.add(t, "Hobgoblin", func(input *miniatures.Input) {
		input.Tags = []string{"goblinoid", "faction:red-hand"}
		input.OwnerID = &ana.ID
	})
	f.add(t, "Worg", typeAndTags("monstrosity"))

	definitions, err := f.filters.Definitions(t.Context())
	if err != nil {
		t.Fatalf("Definitions: %v", err)
	}

	keys := make([]string, len(definitions))
	byKey := map[string]filters.DefinitionWithOptions{}
	for i, definition := range definitions {
		keys[i] = definition.Key
		byKey[definition.Key] = definition
	}
	if want := []string{"q", "creatureType", "size", "challengeRating", "owner", "paintStatus", "tags"}; !slices.Equal(keys, want) {
		t.Errorf("keys = %q, want %q", keys, want)
	}
	assertOption(t, byKey["creatureType"].Options, "humanoid", 2)
	assertOption(t, byKey["creatureType"].Options, "ooze", 0)
	if got := byKey["owner"].Options; len(got) != 2 || got[0].Label != "Ana" || got[0].Count != 1 || got[1].Label != "Mateus" || got[1].Count != 2 {
		t.Errorf("owner options = %+v, want Ana 1 then Mateus 2", got)
	}
	if got := byKey["tags"].Options; len(got) != 2 || got[0].Value != "goblinoid" || got[0].Count != 2 || got[1].Value != "faction:red-hand" {
		t.Errorf("tag options = %+v, want goblinoid 2 then faction:red-hand 1", got)
	}
}

func TestCard6_OwnerOptionsListDeactivatedOwnersAToZIgnoringCase(t *testing.T) {
	f := newFixture(t)
	bea := f.addMember(t, "bea@example.com", "Bea")
	ana := f.addMember(t, "ana@example.com", "ana")
	f.add(t, "Goblin", func(input *miniatures.Input) { input.OwnerID = &bea.ID })
	f.add(t, "Ogre", func(input *miniatures.Input) { input.OwnerID = &ana.ID })
	f.add(t, "Troll", nil)
	if _, err := f.pool.Exec(t.Context(), "UPDATE users SET active = false WHERE id = $1", ana.ID); err != nil {
		t.Fatalf("deactivate: %v", err)
	}

	definitions, err := f.filters.Definitions(t.Context())
	if err != nil {
		t.Fatalf("Definitions: %v", err)
	}

	var labels []string
	for _, definition := range definitions {
		if definition.Key == "owner" {
			for _, option := range definition.Options {
				labels = append(labels, option.Label)
			}
		}
	}
	if want := []string{"ana", "Bea", "Mateus"}; !slices.Equal(labels, want) {
		t.Errorf("owner labels = %q, want %q", labels, want)
	}
}

func assertOption(t *testing.T, options []filters.Option, value string, count int) {
	t.Helper()
	for _, option := range options {
		if option.Value == value {
			if option.Count != count {
				t.Errorf("%s count = %d, want %d", value, option.Count, count)
			}
			return
		}
	}
	t.Errorf("no option %s in %+v", value, options)
}

func TestCard6_ATagRemovedFromEveryMiniLeavesTheTagsInUse(t *testing.T) {
	f := newFixture(t)
	f.add(t, "Goblin", typeAndTags("humanoid", "goblinoid", "old-tag"))
	goblin, err := f.miniatures.List(t.Context(), f.admin, miniatures.ListOptions{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	saved := goblin.Items[0]
	if _, err := f.miniatures.Update(t.Context(), f.admin, saved.ID, saved.Version,
		miniatures.Input{Name: "Goblin", CreatureType: "humanoid", Size: "small", Tags: []string{"goblinoid"}}); err != nil {
		t.Fatalf("Update: %v", err)
	}

	inUse, err := f.filters.TagsInUse(t.Context())

	if err != nil {
		t.Fatalf("TagsInUse: %v", err)
	}
	if len(inUse) != 1 || inUse[0].Value != "goblinoid" || inUse[0].Count != 1 {
		t.Errorf("tags in use = %+v, want only goblinoid", inUse)
	}
}
