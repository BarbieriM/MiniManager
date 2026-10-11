# Spec: Step 2, the miniature Catalog

Build order step 2 from `docs/plan.md`: miniature create, list, details, edit and delete with the version check.
It covers Card 5 rules 1 to 3 and 5 to 10, and Card 4 rules 1 to 4 and 8. Decisions were made in the planning
session of 2026-10-10 (questions Q1 to Q13).

## Problem Statement

The group can log in, but the Catalog is empty and nobody can put anything in it. Each Player owns physical
miniatures that only they know about. Until each Owner can enter their Miniatures, and everyone can browse what
the group has, Mini Manager does nothing for a game night. Without permission checks, any User could change
anyone's Miniatures. Without the version check, two people editing the same Miniature would silently overwrite
each other.

## Solution

Every logged-in User can browse the whole Catalog, 24 Miniatures per page, A to Z, and open any Miniature's
details. Each User can add Miniatures they own, and edit or delete only those. An Admin can change any Miniature
and its Owner. Two people editing the same Miniature cannot silently overwrite each other: the second save is
refused with a clear message. On a phone, the bottom bar gives Catalog, Add and Profile, and Profile holds
Log out.

## User Stories

1. As a User, I want to add a Miniature with only name, type and size, so that entering 300 minis is quick
   (Card 5 acceptance criterion 1).
2. As a User, I want a new Miniature to default to quantity 1 and Unpainted, so that I only change what
   differs.
3. As a User, I want the Miniatures I add to be owned by me, so that the group knows who holds them (Card 4
   rule 2).
4. As a User, I want to give a Miniature a Challenge Rating chosen from the official 5e list, or none (Card 5
   rule 2).
5. As a User, I want a quantity of 0 or 2.5 to be refused with "Quantity must be a whole number from 1 to 999."
   (Card 5 rule 1, acceptance criterion 2).
6. As a User, I want to be offered "Delete this miniature instead" when I type 0, so that the right action is one
   click away (Card 5 rule 1).
7. As a User, I want tags normalized as I type them ("Goblin Boss" → `goblin-boss`, "Faction: Drow" →
   `faction:drow`), so that the same tag is never written two ways (Card 5 rule 3).
8. As a User, I want invalid tags, tags over 30 characters and more than 20 tags to be refused with clear
   messages.
9. As a User, I want to give two Miniatures the same name, because variants share names (Card 5 rule 5).
10. As a User, I want to note a storage location, manufacturer and notes on a Miniature.
11. As a User, I want to see the whole Catalog, from every Owner (Card 4 rule 1).
12. As a User, I want the Catalog sorted A to Z, 24 per page, with paging (Card 5 rule 10, acceptance
    criterion 5).
13. As a User on a desktop, I want the Catalog as a table: thumbnail, name, size, type, CR, paint status, Owner
    and quantity.
14. As a User on a phone, I want the Catalog as cards I can tap.
15. As a User, I want to open a Miniature's details and see every field.
16. As a Member, I want to see someone else's Miniature without edit or delete buttons (Card 4 acceptance
    criterion 1).
17. As a Member, I want the server to refuse my changes to someone else's Miniature with 403 "You can only change
    your own miniatures.", whatever the UI shows (Card 4 rule 8, acceptance criterion 2).
18. As a Member, I want no owner field in the form at all, because I can only own my own Miniatures.
19. As an Admin, I want to edit and delete any Miniature (Card 4 rule 4).
20. As an Admin, I want to pick any active User as a Miniature's Owner, when adding or editing (Card 4 rule 4).
21. As a User, I want my save refused with "Someone changed this miniature while you were editing. Reload to see
    their changes." when someone saved first (Card 5 rule 7, acceptance criterion 3).
22. As a User, I want to delete my Miniature after confirming, and have it gone permanently (Card 5 rule 8,
    acceptance criterion 4).
23. As a User opening a deleted Miniature from an old link, I want "This miniature no longer exists." and a link
    back to the Catalog.
24. As a User, I want the dates and creator to be set by the server, so that nobody can fake them (Card 5 rule 6).
25. As a User whose access token expired, I want the app to refresh it and retry, so that I am not logged out
    every 15 minutes.
26. As a User whose Session ended, I want to land on the login screen and come back to the same page, filters and
    all, after logging in.
27. As a User on a phone, I want a bottom bar with Catalog, Add and Profile, and Log out on the Profile page.
28. As a User with an empty Catalog, I want one clear action: add the first Miniature.

## Implementation Decisions

### Scope

- **Card 5:** rules 1, 2, 3, 5, 6, 7, 9 and 10. Rule 8 covers deleting the Miniature only; its Photos arrive in
  step 5 and will cascade then. Rule 4 needs no code (faction, weapon and armour are tags).
- **Card 4:** rules 1 to 4 and 8, with acceptance criteria 1 and 2.
- **Card 4 rules 5 to 7** (invites, roles, deactivation, last Admin) stay in step 4.
- **No feature flag.** The feature is complete for its cards at the end of the step, and nothing is deployed.
  `feature_flags` arrives with the first truly half-shipped feature.

### Migration 00002 (reviewed by Mateus before anything applies it)

- **Extension:** `pg_trgm`.
- **Enums:**
  - `creature_size`: tiny, small, medium, large, huge, gargantuan, in that order, so sorting by size works.
  - `creature_type`: Card 5's 14 types, in the card's order.
  - `paint_status`: pre_painted, hand_painted, unpainted.
- **The `miniatures` table, as in `docs/plan.md`:**
  - **Identity, links and versioning:**
    - `id`.
    - `owner_id` and `created_by`, both linked to `users` with no cascade (Users are deactivated, never
      deleted).
    - `version` (default 1).
  - **Fields from the card:**
    - `name`, and `name_search` (written by the service).
    - `creature_type`, `size`, `challenge_rating` (`numeric(5,3)`, nullable), `quantity`.
    - `paint_status` (default unpainted), `tags` (`text[]`, default empty).
    - `storage_location`, `manufacturer`, `notes`.
  - **Empty extras for later:** `system_stats` and `custom_fields` (JSONB, default `{}`).
  - **Timestamps:** `created_at`, `updated_at`.
- **Checks:** name is 1 to 100 characters, quantity is 1 to 999, the Challenge Rating is one of the official
  values, and there are at most 20 tags. Tag format is checked by the service only.
- **Indexes:** every one in the plan's "Indexes for the filters" table except the later `system_stats` one,
  including GIN on tags and a trigram GIN on `name_search`.

### Rules in the service

- **`name_search`:** written on every save. It is the name lower-cased with accents removed, using
  `golang.org/x/text` (a new direct dependency, approved; recorded in the plan's library table).
- **Tags:** the service normalizes and validates them exactly as `web/src/shared/lib/addTag.ts` does, with the
  same three messages:
  - "A tag must be 1 to 30 characters."
  - "Use letters, numbers, - or _ in tags, with an optional namespace like faction:drow."
  - "A miniature can have at most 20 tags."

  These messages are added to Card 5 as a dated clarification.
- **Quantity:** 0 is always refused with the quantity message. The form offers deletion instead.
- **Owner:**
  - Defaults to the User creating the Miniature.
  - Only an Admin may set or change `ownerId`, and only to an active User. Anyone else sending a different
    `ownerId` gets 403.
- **Updates:** they carry `version`. The update only applies when the stored version matches, and the version
  goes up by one. Otherwise the answer is 409 with the card's conflict message.
- **Permissions:** every "may this User change this Miniature" check goes through `features/users/policy.go`
  (owner or Admin).

### API

All endpoints under `/api/v1` need a valid access token. The access-token middleware deferred from step 1 lands
here: a missing or invalid token, or a deactivated User, gets 401.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/miniatures?page=&pageSize=&sort=` | `{ items, total, page, pageSize }`; default 24, max 100 |
| POST | `/miniatures` | 201 with the Miniature |
| GET | `/miniatures/{id}` | the Miniature, or 404 "This miniature no longer exists." |
| PUT | `/miniatures/{id}` | the updated Miniature with its new `version`; 400, 403, 404, 409 |
| DELETE | `/miniatures/{id}` | 204; 403, 404 |
| GET | `/users/options` | active Users as `{ id, displayName }`, for the Admin's owner picker |

- **`sort`:** one of `name` (default), `-createdAt`, `challengeRating` or `size`. Ties are broken by `id`, so
  paging is stable.
- **Invalid and unknown parameters:** an invalid `sort`, `page` or `pageSize` gets 400. An unknown query
  parameter is ignored.
- **Miniature JSON:**
  `{ id, name, owner: { id, displayName }, creatureType, size, challengeRating, quantity, paintStatus, tags,
  storageLocation, manufacturer, notes, version, createdAt, updatedAt, canChange }`.
  - `challengeRating` is a number or null.
  - `canChange` comes from `policy.go`; the UI only reads it.
- **Server-owned fields:** a body containing `id`, `createdAt`, `updatedAt`, `createdBy` or `version` (on
  create) gets 400 with a field error (Card 5 rule 6).
- **Errors:** RFC 9457 problem+json with field-level `errors`, as in step 1.

### Web

- **Data:**
  - TanStack Query for the list and details, with `QueryClientProvider` at the app root.
  - An authorized request helper attaches the access token from `AuthProvider`. On a 401 it refreshes once and
    retries; if the refresh fails, it logs the User out.
- **Login redirect:** `RequireAuth` keeps the path **and query** for the trip back after login (fixing the
  step 1 review note).
- **Screens** (`docs/context.md`, "Screens and routes"):
  - `/`: the Catalog. Desktop shows a table; phones show cards. It has empty, loading and paging states.
    Thumbnails show the base glyph until Photos exist. The empty state's action is "Add your first miniature".
  - `/minis/new`: name, type and size come first; quantity defaults to 1 and paint status to Unpainted.
  - `/minis/:id`: details.
    - The Owner or an Admin gets Edit and Delete.
    - Anyone else gets a note panel and no actions.
    - A deleted Miniature shows a not-found page linking back.
  - `/minis/:id/edit`:
    - Inline field errors.
    - The owner picker shows for Admins only; Members get no owner field at all. This changes `context.md`'s
      read-only owner for Members, and `context.md` is updated to match.
    - A version conflict opens a dialog that offers Reload only.
    - Quantity 0 shows the error plus "Delete this miniature instead".
  - **Delete:** a confirmation dialog, then back to the Catalog.
  - `/profile`: a minimal page with the User's name and a Log out row. The rest of Card 3 waits for its own step.
    Log out leaves the phone header.
- **Shell:** the BottomBar (Catalog, Add, Profile) shows on phones, hidden on forms and on details for those
  who can change the Miniature, as `context.md` says.
- **Tags:** TagInput takes typed tags only. Suggestions from `GET /tags` come with step 3.

### Modules

- **Miniatures feature (API):** the service holding the Card 5 rules, its queries (sqlc for the fixed queries;
  the list's sort uses fixed sqlc queries per sort, with squirrel waiting for step 3's filters), and its
  handler.
- **Users feature:** `policy.go` (`CanChangeMiniature(user, ownerID)`), the active-Users list for
  `/users/options`, and the auth middleware's User lookup.
- **Platform httpx:** the access-token middleware and a "current User" lookup from the request context.

## Testing Decisions

- **One test per numbered rule, named after it**, for example `TestCard5_Rule7_OutdatedVersionReturns409` and
  `TestCard4_Rule3_AMemberCannotEditSomeoneElsesMiniature`.
- **Tests check behaviour,** never SQL or internal calls.
- **Seam 1, the miniatures service against real Postgres (main seam):**
  - Every Card 5 and Card 4 rule above.
  - `name_search` with accents.
  - Owner rules for Members and Admins.
  - Paging and sort stability.
- **Seam 2, the HTTP router:**
  - The wire contract: the 400, 401, 403, 404 and 409 status codes and their bodies.
  - The list envelope, `canChange` in responses, and refusal of server-owned fields.
  - The middleware refusing a missing or invalid token and a deactivated User.
- **Seam 3, the web flows with `fetch` stubbed:**
  - Add a mini with only the required fields, then find it in the Catalog.
  - A Member sees no Edit or Delete on someone else's mini.
  - The conflict dialog.
  - Quantity 0 offering Delete.
  - Delete with confirmation.
  - The not-found page.
  - Paging.
  - A 401 refreshes once and retries.
  - Login returns to the original path with its query.
  - Log out from Profile.
- **Prior art:** the step 1 tests (`auth/service_test.go`, `cmd/server/routes_test.go`, `app/routes.test.tsx`)
  and the `dbtest`, `stubFetch` and `jsonResponse` helpers.
- **Playwright:** still waits for step 4. CLAUDE.md's Member flow needs invites.

## Out of Scope

- **Filters, search, sort controls, tag suggestions and `GET /tags`:** step 3.
- **Invites, roles, deactivation, the last-Admin rule and the Members page:** step 4.
- **Photos and their cascade on delete:** step 5.
- **The rest of Profile** (editing it, changing password): its own step.
- **Feature flags.**
- **Applying migration 00002 anywhere before Mateus approves it.**

## Further Notes

- **Order of work:** migration 00002 is written first and handed over for review. No database is touched, and
  no test that applies it runs, until it is approved.
- **Card gaps resolved in planning:**
  - Owner editing (Admins only, no field for Members).
  - Quantity 0 (refuse, offer delete).
  - Sort scope.
  - Tag messages.
  - `canChange` from the server.

  Any new gap found while building stops the work for a question.
