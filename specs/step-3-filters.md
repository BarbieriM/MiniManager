# Spec: Step 3, search and filters

Build order step 3 from `docs/plan.md`: the filter registry and the 7 MVP filters, with filters stored in the URL.
It covers Card 6 rules 1 to 10 and acceptance criteria 1 to 5, the sort control, and the tag suggestions deferred
from step 2. Decisions were made in the planning session of 2026-10-11 (questions Q1 to Q16).

## Problem Statement

The Catalog lists every Miniature A to Z, 24 at a time. With 300+ minis across ten Owners, a DM preparing a session
cannot find "medium humanoids tagged goblinoid, CR 1 to 3" without paging through everything. Nobody can share a
narrowed list either, or come back to it after a reload.

## Solution

Above the Catalog, a search box finds Miniatures by any part of their name, ignoring case and accents. On a desktop,
a filter rail narrows the list by type, size, Challenge Rating range, Owner, paint status and tags. On a phone, the
same filters are in a bottom sheet. Inside one filter, values combine with OR; different filters combine with AND.
Tags can match any or all of the chosen tags. Active filters show as chips that can be removed one by one or all at
once. The result count is always shown ("48 of 312 minis"). The whole state lives in the URL, so a reload, the back
button or a pasted link gives the same results. The list can be sorted by name, Challenge Rating, newest or size, in
either direction. When adding or editing a Miniature, the tag field suggests tags already in use.

## User Stories

1. As a DM, I want to search by any part of a name ("gob" finds "Hobgoblin Captain"), so that I find minis without
   knowing their full name (Card 6 rule 4).
2. As a DM, I want "GOB" and "gob", and "éttercap" and "ettercap", to find the same minis (Card 6 rule 4,
   acceptance criterion 5).
3. As a DM, I want quotes, `%`, `_` and backslashes in the search to match as plain text.
4. As a DM, I want to filter by several creature types, sizes, Owners and paint statuses, where choosing Large and
   Small shows minis of either size (Card 6 rule 2, acceptance criterion 1).
5. As a DM, I want different filters to narrow each other: humanoid AND tagged goblinoid (Card 6 rule 1,
   acceptance criterion 2).
6. As a DM, I want tags to match any of the chosen tags by default, and to switch to "match all" (Card 6 rule 3).
7. As a DM, I want a Challenge Rating range from a minimum to a maximum, with minis without a Challenge Rating left out
   only while that range is set (Card 6 rule 5).
8. As a DM, I want "Minimum CR cannot be higher than maximum CR." when the range is backwards (acceptance
   criterion 4).
9. As a DM, I want to filter by a deactivated Owner and still see their minis (Card 6 edge case, Card 4 rule 7).
10. As a DM, I want each option to show how many minis in the Catalog have it ("Humanoid 96").
11. As a DM, I want the result count always shown, as "48 of 312 minis" while filtering (Card 6 rule 7).
12. As a DM, I want "No miniatures match these filters." and a "Clear filters" button when nothing matches.
13. As a DM, I want each active filter value as a chip I can remove, and "Clear all".
14. As a DM, I want filters, sort and page in the URL, so that reload, back and a pasted link reproduce my results
    (Card 6 rule 6, acceptance criterion 3).
15. As a DM, I want any filter or sort change to take me back to page 1.
16. As a DM, I want to sort by name, Challenge Rating, newest or size, in either direction.
17. As a DM on a desktop, I want to sort by clicking a column header, and reverse it with a second click.
18. As a DM on a phone, I want filters in a bottom sheet whose button says how many minis I will get ("Show 48
    minis"), and nothing to change until I tap it.
19. As a DM on a phone, I want a Sort select above the cards.
20. As a DM, I want typing in the search box to update the results by itself, 300 ms after I stop typing.
21. As a User adding or editing a mini, I want the tag field to suggest tags already in use, so that "goblinoid"
    is not typed three different ways.
22. As a User, I want a tag removed from every mini to disappear from the suggestions and the tag filter (Card 6
    edge case).
23. As a developer, I want each filter defined once, so that its URL parameter, validation, query and UI control come
    from one place (Card 6 rule 10).

## Implementation Decisions

### Card 6 as clarified on 2026-10-11

- **Dropped:** the `minQuantity` filter and sorting by quantity.
- **Added:** sorting by size.
- **URL format:**
  - A multi-select repeats its parameter once per value: `?size=small&size=medium`.
  - Owners are sent by user id.
  - `tagMatch=all` switches tags to "match all"; the default is any.
- **Option counts** are whole-Catalog counts. Faceted counts, which follow the other active filters, are out of
  scope.
- CLAUDE.md and the plan now say 7 MVP filters.

### The filters

| Parameter | Control | Rule |
| --- | --- | --- |
| `q` | search box (above the results, not in the rail) | name contains the text, case- and accent-insensitive; matched against `name_search` with `%`, `_` and `\` escaped |
| `creatureType` | checkbox list with counts | OR of the chosen types |
| `size` | checkbox list with counts, in size order | OR of the chosen sizes |
| `crMin`, `crMax` | Challenge Rating range (two selects) | official CR values only; min ≤ max; minis with no CR excluded only when either is set |
| `owner` | checkbox list with counts, A to Z | OR of user ids; every User owning at least one mini, deactivated ones included |
| `paintStatus` | checkbox list with counts | OR of the chosen statuses |
| `tags`, `tagMatch` | tag combobox plus Match any / Match all | `any`: shares at least one tag (`&&`); `all`: has every tag (`@>`). Tags are normalized as in Card 5 rule 3 |

- **Combining:** different filters combine with AND (Card 6 rule 1).
- **Unknown parameters** are ignored (rule 8).
- **Invalid values** for a known filter get 400 with the field name, for example an unknown type, a CR that is not
  official, a malformed owner id, or `tagMatch` other than any or all.

### Filter registry (API)

- **Location:** `features/filters/`, one file per filter, each implementing `Def()` and `Apply()` and registering
  itself in `init()`. That registry is the only global state CLAUDE.md allows.
- **What a filter does:**
  - Parses and validates its own parameters, returning field errors.
  - Adds its condition to the squirrel query.
  - Describes its control: key, label, control type, parameter names and options.
- **Option counts:** a filter with options computes them with one grouped count query over the whole Catalog.
- **The list query:**
  - It becomes one squirrel-built query: the registered filters' conditions, then the sort and the paging. A count
    query is built from the same conditions. This replaces step 2's four fixed list queries.
  - The miniatures service asks the filters service to apply the filters (feature isolation: it imports only the
    filters package's exported API).
- **Rules live in the services,** not the handlers. Tests call the services directly.

### Sorting

- **Values:** `name`, `challengeRating`, `createdAt` and `size`, each ascending, or descending with a leading `-`.
  Newest first is `-createdAt`. The default is `name`.
- **Ties** always end on `name_search` and then `id`, so paging is stable.
- **Challenge Rating:** minis without one sort last in both directions.

### API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/miniatures?…filters…&sort=&page=&pageSize=` | `{ items, total, page, pageSize, catalogTotal }`; `catalogTotal` is the unfiltered count |
| GET | `/filters` | the definitions in display order, each with its control and options with whole-Catalog counts |
| GET | `/tags` | tags in use with their counts, most used first then A to Z |

The plan's endpoint table records `catalogTotal` as an addition to CLAUDE.md's list envelope.

### Web

- **Catalog toolbar,** above the results:
  - `SearchInput`, debounced 300 ms.
  - `ResultCount` ("48 of 312 minis" while filtering, "312 minis" otherwise).
  - On phones, a Sort `Select` and a Filters button showing how many filters are active.
- **Desktop:**
  - A filter rail (280 px) drawn from `GET /filters`. Groups collapse.
  - Changes apply at once, writing to the URL.
- **Phone:**
  - A `Sheet` with the same controls, working on a pending copy of the filters.
  - The footer button "Show N minis" uses a live count of the pending filters, debounced 300 ms, through the list
    endpoint with `pageSize=1`.
  - The URL only changes on tap.
- **Chips:** `FilterChip`s above the results, one per active value, plus "Clear all".
- **No results:** an `EmptyState` with "No miniatures match these filters." and "Clear filters".
- **CR error:** the range shows "Minimum CR cannot be higher than maximum CR." and is not applied until fixed.
- **Sorting:** `CatalogTable` headers become sort buttons with a direction indicator. The first click sorts
  ascending, the second reverses.
- **URL:** filters, sort and page are read from and written to the URL query. Any filter or sort change removes
  `page`.
- **Tag suggestions:** the miniature form's `TagInput` gets `tagsInUse` from `GET /tags`.
- **Query keys:** for filters and tags, in `shared/api/queryKeys.ts`. The list's key includes the filter state.

### No migration

Migration 00002 already created every index this step uses: the trigram GIN on `name_search`, GIN on tags, and
btree on type, size, paint status, owner, Challenge Rating and creation time. Nothing needs a schema review.

## Testing Decisions

- **One test per rule, named after it,** for example `TestCard6_Rule2_ValuesInsideOneFilterCombineWithOR` and
  `it("card 6 rule 6: the filter state lives in the URL")`.
- **Seam 1, the filters and miniatures services against real Postgres:**
  - Each filter's matching, and OR within a filter / AND across filters (acceptance criteria 1 and 2).
  - Tags any and all; the CR range with excluded nulls and the min > max error; a deactivated Owner.
  - Search with case, accents and special characters (acceptance criterion 5).
  - Every sort in both directions, with stable ties.
  - Invalid values as field errors; unknown parameters ignored.
  - Option counts; `catalogTotal`.
  - `GET /tags` content, including a tag that leaves every mini.
- **Seam 2, the HTTP router:**
  - Query parameters to results, repeated parameters, 400 with field names, unknown parameters ignored.
  - The `/filters` and `/tags` shapes.
- **Seam 3, the web flows with `fetch` stubbed:**
  - Filtering writes the URL, and a reload restores filters and page (acceptance criterion 3).
  - The CR error (acceptance criterion 4).
  - Chips and Clear all; no-results with Clear filters.
  - Sort by header and by the phone select.
  - The phone sheet's pending state and its "Show N minis".
  - A debounced search; page reset on change.
  - Tag suggestions in the form.
- **Prior art:** step 2's service, router and web tests, and the `dbtest`, `stubFetch`, `renderAppAt` and
  `miniatureFor` helpers.

## Out of Scope

- **Faceted counts** (counts that follow the other active filters), and disabling options at 0.
- **Filters on storage location or manufacturer:** v1.1, the plan's worked example.
- **The `minQuantity` filter and the quantity sort:** dropped. Card 8 can bring quantity back.
- **Saved filter presets and a nested AND / OR builder:** v1.1.
- **The `GridTile` photo grid view:** step 5, with Photos.
- **Feature flags:** the step is complete for Card 6 when merged, and nothing is deployed.

## Further Notes

- **Seeding test data:** the services' tests seed Miniatures through the step 2 service, so the filters are
  checked against data written by the real rules (tags normalized, `name_search` filled).
- **Further gaps:** any card gap found while building stops work for a question.
