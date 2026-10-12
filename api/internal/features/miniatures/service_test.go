package miniatures_test

import (
	"errors"
	"fmt"
	"slices"
	"strings"
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

// testClock is a clock the test moves by hand.
type testClock struct{ current time.Time }

func (c *testClock) Now() time.Time { return c.current }

type fixture struct {
	service *miniatures.Service
	users   *users.Service
	pool    *pgxpool.Pool
	clock   *testClock
	admin   users.User
	member  users.User // Ana
	other   users.User // Rafa, another Member
}

// newFixture returns a miniatures Service over a fresh database with one Admin and two Members.
func newFixture(t *testing.T) fixture {
	t.Helper()
	pool := dbtest.NewDatabase(t)
	userService := users.NewService(pool)
	if _, err := userService.CreateAdmin(t.Context(), users.NewAdmin{
		Email: "mateus@example.com", Password: "correct horse", DisplayName: "Mateus",
	}); err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	clock := &testClock{current: time.Date(2026, 10, 11, 20, 0, 0, 0, time.UTC)}
	f := fixture{
		service: miniatures.NewService(pool, userService, filters.NewService(pool, userService), photos.NewGallery(pool, nil), clock.Now),
		users:   userService,
		pool:    pool,
		clock:   clock,
	}
	f.admin = f.findUser(t, "mateus@example.com")
	f.member = f.addMember(t, "ana@example.com", "Ana")
	f.other = f.addMember(t, "rafa@example.com", "Rafa")
	return f
}

// addMember stands in for Card 1's invites, which arrive in build step 4.
func (f fixture) addMember(t *testing.T, email, displayName string) users.User {
	t.Helper()
	id, err := uuid.NewV7()
	if err != nil {
		t.Fatalf("new id: %v", err)
	}
	if _, err := f.pool.Exec(t.Context(),
		"INSERT INTO users (id, email, password_hash, display_name, role) VALUES ($1, $2, 'not used', $3, 'member')",
		id, email, displayName); err != nil {
		t.Fatalf("insert member: %v", err)
	}
	return f.findUser(t, email)
}

func (f fixture) findUser(t *testing.T, email string) users.User {
	t.Helper()
	user, err := f.users.FindByEmail(t.Context(), email)
	if err != nil {
		t.Fatalf("FindByEmail(%s): %v", email, err)
	}
	return user
}

func goblin() miniatures.Input {
	return miniatures.Input{Name: "Goblin", CreatureType: "humanoid", Size: "small"}
}

func (f fixture) create(t *testing.T, actor users.User, input miniatures.Input) miniatures.Miniature {
	t.Helper()
	miniature, err := f.service.Create(t.Context(), actor, input)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	return miniature
}

func TestCard5_AcceptanceCriterion1_NameTypeAndSizeAreEnough(t *testing.T) {
	f := newFixture(t)

	created := f.create(t, f.member, goblin())

	got, err := f.service.Get(t.Context(), f.member, created.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.Name != "Goblin" || got.CreatureType != "humanoid" || got.Size != "small" {
		t.Errorf("got %q, %q, %q; want Goblin, humanoid, small", got.Name, got.CreatureType, got.Size)
	}
	if got.Quantity != 1 || got.PaintStatus != "unpainted" {
		t.Errorf("quantity %d, paint status %q; want 1 and unpainted", got.Quantity, got.PaintStatus)
	}
	if got.Owner.ID != f.member.ID || got.Owner.DisplayName != "Ana" {
		t.Errorf("owner = %+v, want Ana", got.Owner)
	}
	if got.Version != 1 || !got.CreatedAt.Equal(f.clock.Now()) {
		t.Errorf("version %d, created %v; want 1 and %v", got.Version, got.CreatedAt, f.clock.Now())
	}
}

// assertFieldError checks err is a validation error on field with message.
func assertFieldError(t *testing.T, err error, field, message string) {
	t.Helper()
	var invalid validation.Errors
	if !errors.As(err, &invalid) {
		t.Fatalf("error = %v, want a validation error on %s", err, field)
	}
	for _, fieldError := range invalid {
		if fieldError.Field == field && fieldError.Message == message {
			return
		}
	}
	t.Fatalf("validation errors = %v, want %s: %q", invalid, field, message)
}

func (f fixture) catalogSize(t *testing.T) int {
	t.Helper()
	page, err := f.service.List(t.Context(), f.admin, miniatures.ListOptions{Page: 1, PageSize: 100, Sort: miniatures.SortByName})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	return page.Total
}

func TestCard5_Rule1_QuantityMustBeAWholeNumberFrom1To999(t *testing.T) {
	f := newFixture(t)
	for _, quantity := range []int{0, -1, 1000} {
		input := goblin()
		input.Quantity = &quantity

		_, err := f.service.Create(t.Context(), f.member, input)

		assertFieldError(t, err, "quantity", "Quantity must be a whole number from 1 to 999.")
	}
	if total := f.catalogSize(t); total != 0 {
		t.Errorf("Catalog has %d miniatures after refused saves, want 0", total)
	}
}

func TestCard5_NameIsRequiredAndAtMost100Characters(t *testing.T) {
	f := newFixture(t)
	for _, name := range []string{"", "   ", strings.Repeat("a", 101)} {
		input := goblin()
		input.Name = name

		_, err := f.service.Create(t.Context(), f.member, input)

		if name == strings.Repeat("a", 101) {
			assertFieldError(t, err, "name", "Name must be at most 100 characters.")
		} else {
			assertFieldError(t, err, "name", "Name is required.")
		}
	}
}

func TestCard5_Rule2_ChallengeRatingMustBeAnOfficialValue(t *testing.T) {
	f := newFixture(t)
	for _, rating := range []float64{0.3, 31, 1.5, -1} {
		input := goblin()
		input.ChallengeRating = &rating

		_, err := f.service.Create(t.Context(), f.member, input)

		assertFieldError(t, err, "challengeRating", "Pick a valid Challenge Rating.")
	}
	for _, rating := range []float64{0, 0.125, 0.25, 0.5, 1, 30} {
		input := goblin()
		input.ChallengeRating = &rating
		if got := f.create(t, f.member, input); got.ChallengeRating == nil || *got.ChallengeRating != rating {
			t.Errorf("Challenge Rating %v saved as %v", rating, got.ChallengeRating)
		}
	}
}

func TestCard5_TypeSizePaintStatusAndTextLengthsAreChecked(t *testing.T) {
	f := newFixture(t)
	tests := []struct {
		edit    func(*miniatures.Input)
		field   string
		message string
	}{
		{func(i *miniatures.Input) { i.CreatureType = "goblinoid" }, "creatureType", "Pick a creature type."},
		{func(i *miniatures.Input) { i.Size = "colossal" }, "size", "Pick a size."},
		{func(i *miniatures.Input) { i.PaintStatus = "painted" }, "paintStatus", "Pick a paint status."},
		{func(i *miniatures.Input) { i.StorageLocation = strings.Repeat("a", 61) }, "storageLocation", "Storage location must be at most 60 characters."},
		{func(i *miniatures.Input) { i.Manufacturer = strings.Repeat("a", 61) }, "manufacturer", "Manufacturer must be at most 60 characters."},
		{func(i *miniatures.Input) { i.Notes = strings.Repeat("a", 1001) }, "notes", "Notes must be at most 1000 characters."},
	}
	for _, test := range tests {
		input := goblin()
		test.edit(&input)

		_, err := f.service.Create(t.Context(), f.member, input)

		assertFieldError(t, err, test.field, test.message)
	}
}

func TestCard5_OptionalTextIsSaved(t *testing.T) {
	f := newFixture(t)
	input := goblin()
	input.StorageLocation, input.Manufacturer, input.Notes = " Box 3 ", "WizKids", "Chipped spear"

	got := f.create(t, f.member, input)

	if got.StorageLocation != "Box 3" || got.Manufacturer != "WizKids" || got.Notes != "Chipped spear" {
		t.Errorf("got %q, %q, %q", got.StorageLocation, got.Manufacturer, got.Notes)
	}
}

func TestCard5_Rule3_TagsAreNormalizedAndDeduplicated(t *testing.T) {
	f := newFixture(t)
	input := goblin()
	input.Tags = []string{"Goblin Boss", "Faction : Drow", "goblin-boss", "  weapon:bow  ", "HAS_SHIELD"}

	got := f.create(t, f.member, input)

	want := []string{"goblin-boss", "faction:drow", "weapon:bow", "has_shield"}
	if !slices.Equal(got.Tags, want) {
		t.Errorf("tags = %q, want %q", got.Tags, want)
	}
}

func TestCard5_Rule3_InvalidTagsAreRefused(t *testing.T) {
	f := newFixture(t)
	tests := []struct {
		tags    []string
		message string
	}{
		{[]string{strings.Repeat("a", 31)}, "A tag must be 1 to 30 characters."},
		{[]string{"   "}, "A tag must be 1 to 30 characters."},
		{[]string{"goblin!"}, "Use letters, numbers, - or _ in tags, with an optional namespace like faction:drow."},
		{[]string{"a:b:c"}, "Use letters, numbers, - or _ in tags, with an optional namespace like faction:drow."},
		{manyTags(21), "A miniature can have at most 20 tags."},
	}
	for _, test := range tests {
		input := goblin()
		input.Tags = test.tags

		_, err := f.service.Create(t.Context(), f.member, input)

		assertFieldError(t, err, "tags", test.message)
	}
	input := goblin()
	input.Tags = manyTags(20)
	f.create(t, f.member, input)
}

func manyTags(count int) []string {
	tags := make([]string, count)
	for i := range tags {
		tags[i] = fmt.Sprintf("tag-%d", i)
	}
	return tags
}

func (f fixture) createNamed(t *testing.T, names ...string) {
	t.Helper()
	for _, name := range names {
		input := goblin()
		input.Name = name
		f.create(t, f.member, input)
	}
}

func (f fixture) listNames(t *testing.T, options miniatures.ListOptions) []string {
	t.Helper()
	page, err := f.service.List(t.Context(), f.member, options)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	names := make([]string, len(page.Items))
	for i, miniature := range page.Items {
		names[i] = miniature.Name
	}
	return names
}

func TestCard5_Rule10_TheCatalogIsSortedAToZIgnoringCaseAndAccents(t *testing.T) {
	f := newFixture(t)
	f.createNamed(t, "Zombie", "éttercap", "bugbear", "Ettin")

	got := f.listNames(t, miniatures.ListOptions{Page: 1, PageSize: 24, Sort: miniatures.SortByName})

	if want := []string{"bugbear", "éttercap", "Ettin", "Zombie"}; !slices.Equal(got, want) {
		t.Errorf("names = %q, want %q", got, want)
	}
}

func TestCard5_Rule5_DuplicateNamesAreAllowed(t *testing.T) {
	f := newFixture(t)
	f.createNamed(t, "Goblin", "Goblin")

	if total := f.catalogSize(t); total != 2 {
		t.Errorf("Catalog has %d miniatures, want 2", total)
	}
}

func TestCard5_AcceptanceCriterion5_SixtyMinisShow24PerPage(t *testing.T) {
	f := newFixture(t)
	for i := range 60 {
		f.createNamed(t, fmt.Sprintf("Mini %02d", i))
	}

	var seen []string
	for page := 1; page <= 3; page++ {
		result, err := f.service.List(t.Context(), f.member, miniatures.ListOptions{Page: page, PageSize: 24, Sort: miniatures.SortByName})
		if err != nil {
			t.Fatalf("List page %d: %v", page, err)
		}
		if result.Total != 60 {
			t.Errorf("Total = %d, want 60", result.Total)
		}
		for _, miniature := range result.Items {
			seen = append(seen, miniature.Name)
		}
	}
	if len(seen) != 60 || seen[0] != "Mini 00" || seen[23] != "Mini 23" || seen[59] != "Mini 59" {
		t.Errorf("pages gave %d names, first %q, 24th %q, last %q", len(seen), seen[0], seen[23], seen[len(seen)-1])
	}
}

func TestCard5_Rule10_OtherSortsWork(t *testing.T) {
	f := newFixture(t)
	add := func(name, size string, rating *float64) {
		input := goblin()
		input.Name, input.Size, input.ChallengeRating = name, size, rating
		f.create(t, f.member, input)
		f.clock.current = f.clock.current.Add(time.Minute)
	}
	one, half := 1.0, 0.5
	add("Ogre", "large", &one)
	add("Rat", "tiny", nil)
	add("Kobold", "small", &half)

	options := func(sort miniatures.Sort) miniatures.ListOptions {
		return miniatures.ListOptions{Page: 1, PageSize: 24, Sort: sort}
	}
	if got, want := f.listNames(t, options(miniatures.SortNewestFirst)), []string{"Kobold", "Rat", "Ogre"}; !slices.Equal(got, want) {
		t.Errorf("newest first = %q, want %q", got, want)
	}
	if got, want := f.listNames(t, options(miniatures.SortByChallengeRating)), []string{"Kobold", "Ogre", "Rat"}; !slices.Equal(got, want) {
		t.Errorf("by Challenge Rating = %q, want %q (no rating last)", got, want)
	}
	if got, want := f.listNames(t, options(miniatures.SortBySize)), []string{"Rat", "Kobold", "Ogre"}; !slices.Equal(got, want) {
		t.Errorf("by size = %q, want %q", got, want)
	}
}

func TestCard5_Rule7_AnUpdateRaisesTheVersionAndKeepsCreatedFields(t *testing.T) {
	f := newFixture(t)
	created := f.create(t, f.member, goblin())
	f.clock.current = f.clock.current.Add(time.Hour)
	input := goblin()
	input.Name = "Goblin Boss"

	updated, err := f.service.Update(t.Context(), f.member, created.ID, created.Version, input)

	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Name != "Goblin Boss" || updated.Version != 2 {
		t.Errorf("name %q, version %d; want Goblin Boss and 2", updated.Name, updated.Version)
	}
	if !updated.CreatedAt.Equal(created.CreatedAt) || !updated.UpdatedAt.Equal(f.clock.Now()) || updated.CreatedBy != f.member.ID {
		t.Errorf("created %v by %v, updated %v; want created fields kept and updated now", updated.CreatedAt, updated.CreatedBy, updated.UpdatedAt)
	}
}

func TestCard5_Rule7_OutdatedVersionIsRefused(t *testing.T) {
	f := newFixture(t)
	created := f.create(t, f.member, goblin())
	first, second := goblin(), goblin()
	first.Name, second.Name = "First save", "Second save"

	if _, err := f.service.Update(t.Context(), f.member, created.ID, created.Version, first); err != nil {
		t.Fatalf("first Update: %v", err)
	}
	_, err := f.service.Update(t.Context(), f.admin, created.ID, created.Version, second)

	if !errors.Is(err, miniatures.ErrVersionConflict) {
		t.Fatalf("second Update error = %v, want ErrVersionConflict", err)
	}
	if got, _ := f.service.Get(t.Context(), f.member, created.ID); got.Name != "First save" {
		t.Errorf("name = %q, want the first save kept", got.Name)
	}
}

func TestCard4_Rule3_AMemberCannotEditOrDeleteSomeoneElsesMiniature(t *testing.T) {
	f := newFixture(t)
	anas := f.create(t, f.member, goblin())
	input := goblin()
	input.Name = "Renamed by Rafa"

	_, updateErr := f.service.Update(t.Context(), f.other, anas.ID, anas.Version, input)
	deleteErr := f.service.Delete(t.Context(), f.other, anas.ID)

	if !errors.Is(updateErr, miniatures.ErrForbidden) || !errors.Is(deleteErr, miniatures.ErrForbidden) {
		t.Fatalf("Update error = %v, Delete error = %v; want ErrForbidden for both", updateErr, deleteErr)
	}
	if got, err := f.service.Get(t.Context(), f.member, anas.ID); err != nil || got.Name != "Goblin" || got.Version != 1 {
		t.Errorf("the miniature changed: %+v, %v", got, err)
	}
}

func TestCard4_Rule4_AnAdminCanEditAndDeleteAnyMiniature(t *testing.T) {
	f := newFixture(t)
	anas := f.create(t, f.member, goblin())
	input := goblin()
	input.Name = "Goblin Boss"

	if _, err := f.service.Update(t.Context(), f.admin, anas.ID, anas.Version, input); err != nil {
		t.Fatalf("Admin Update: %v", err)
	}
	if err := f.service.Delete(t.Context(), f.admin, anas.ID); err != nil {
		t.Fatalf("Admin Delete: %v", err)
	}
}

func TestCard4_CanChangeTellsTheUIWhoMayEditAMiniature(t *testing.T) {
	f := newFixture(t)
	anas := f.create(t, f.member, goblin())

	for _, check := range []struct {
		actor users.User
		want  bool
	}{{f.member, true}, {f.other, false}, {f.admin, true}} {
		got, err := f.service.Get(t.Context(), check.actor, anas.ID)
		if err != nil {
			t.Fatalf("Get: %v", err)
		}
		if got.CanChange != check.want {
			t.Errorf("CanChange for %s = %v, want %v", check.actor.DisplayName, got.CanChange, check.want)
		}
	}
}

func TestCard4_Rule4_OnlyAnAdminCanChooseTheOwner(t *testing.T) {
	f := newFixture(t)
	input := goblin()
	input.OwnerID = &f.other.ID

	_, err := f.service.Create(t.Context(), f.member, input)
	if !errors.Is(err, miniatures.ErrForbidden) {
		t.Fatalf("Member choosing another owner: error = %v, want ErrForbidden", err)
	}

	byAdmin := f.create(t, f.admin, input)
	if byAdmin.Owner.ID != f.other.ID || byAdmin.CreatedBy != f.admin.ID {
		t.Errorf("owner %v, created by %v; want Rafa, created by Mateus", byAdmin.Owner.ID, byAdmin.CreatedBy)
	}

	input.OwnerID = &f.member.ID
	moved, err := f.service.Update(t.Context(), f.admin, byAdmin.ID, byAdmin.Version, input)
	if err != nil || moved.Owner.ID != f.member.ID {
		t.Errorf("Admin moving the miniature to Ana: owner %v, error %v", moved.Owner.ID, err)
	}
}

func TestCard4_Rule4_TheOwnerMustBeAnActiveUser(t *testing.T) {
	f := newFixture(t)
	unknown := uuid.Must(uuid.NewV7())
	if _, err := f.pool.Exec(t.Context(), "UPDATE users SET active = false WHERE id = $1", f.other.ID); err != nil {
		t.Fatalf("deactivate: %v", err)
	}
	for _, ownerID := range []uuid.UUID{unknown, f.other.ID} {
		input := goblin()
		input.OwnerID = &ownerID

		_, err := f.service.Create(t.Context(), f.admin, input)

		assertFieldError(t, err, "ownerId", "Pick an owner from the list.")
	}
}

func TestCard5_Rule8_AndAcceptanceCriterion4_DeleteIsPermanent(t *testing.T) {
	f := newFixture(t)
	created := f.create(t, f.member, goblin())

	if err := f.service.Delete(t.Context(), f.member, created.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	if _, err := f.service.Get(t.Context(), f.member, created.ID); !errors.Is(err, miniatures.ErrNotFound) {
		t.Errorf("Get after delete: error = %v, want ErrNotFound", err)
	}
	if err := f.service.Delete(t.Context(), f.member, created.ID); !errors.Is(err, miniatures.ErrNotFound) {
		t.Errorf("second Delete: error = %v, want ErrNotFound", err)
	}
}

func TestCard5_Rule10_ListOptionsAreCheckedByTheService(t *testing.T) {
	f := newFixture(t)
	tests := []struct {
		options miniatures.ListOptions
		field   string
	}{
		{miniatures.ListOptions{Page: 1, PageSize: 101, Sort: miniatures.SortByName}, "pageSize"},
		{miniatures.ListOptions{Page: -1, PageSize: 24, Sort: miniatures.SortByName}, "page"},
		{miniatures.ListOptions{Page: 1, PageSize: 24, Sort: "price"}, "sort"},
		// So far past the end that the offset would not fit the database's 32-bit integer.
		{miniatures.ListOptions{Page: 1_000_000_000, PageSize: 100, Sort: miniatures.SortByName}, "page"},
	}
	for _, test := range tests {
		_, err := f.service.List(t.Context(), f.member, test.options)

		var invalid validation.Errors
		if !errors.As(err, &invalid) || !invalid.Has(test.field) {
			t.Errorf("List(%+v) error = %v, want a validation error on %s", test.options, err, test.field)
		}
	}
}

func TestCard5_Rule10_EmptyListOptionsMeanPage1Of24AToZ(t *testing.T) {
	f := newFixture(t)
	f.createNamed(t, "Zombie", "Bugbear")

	page, err := f.service.List(t.Context(), f.member, miniatures.ListOptions{})

	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if page.Page != 1 || page.PageSize != 24 || page.Items[0].Name != "Bugbear" {
		t.Errorf("page %d, size %d, first %q; want 1, 24 and Bugbear", page.Page, page.PageSize, page.Items[0].Name)
	}
}

func TestCard5_Rule3_TagsTreatUnicodeSpacesLikeTheForm(t *testing.T) {
	f := newFixture(t)
	input := goblin()
	// A non-breaking space and a zero-width no-break space, both whitespace to the browser's \s and trim().
	input.Tags = []string{"goblin\u00a0boss", "\ufefffaction\u00a0:\u00a0drow"}

	got := f.create(t, f.member, input)

	if want := []string{"goblin-boss", "faction:drow"}; !slices.Equal(got.Tags, want) {
		t.Errorf("tags = %q, want %q", got.Tags, want)
	}
}

func TestCard6_EverySortWorksInBothDirections(t *testing.T) {
	f := newFixture(t)
	add := func(name, size string, rating *float64) {
		input := goblin()
		input.Name, input.Size, input.ChallengeRating = name, size, rating
		f.create(t, f.member, input)
		f.clock.current = f.clock.current.Add(time.Minute)
	}
	one, half := 1.0, 0.5
	add("Ogre", "large", &one)
	add("Rat", "tiny", nil)
	add("Kobold", "small", &half)

	for sort, want := range map[miniatures.Sort][]string{
		miniatures.SortByNameDescending:      {"Rat", "Ogre", "Kobold"},
		miniatures.SortOldestFirst:           {"Ogre", "Rat", "Kobold"},
		miniatures.SortByChallengeRatingDesc: {"Ogre", "Kobold", "Rat"}, // no rating sorts last both ways
		miniatures.SortBySizeDescending:      {"Ogre", "Kobold", "Rat"},
	} {
		if got := f.listNames(t, miniatures.ListOptions{Page: 1, PageSize: 24, Sort: sort}); !slices.Equal(got, want) {
			t.Errorf("%s = %q, want %q", sort, got, want)
		}
	}
}
