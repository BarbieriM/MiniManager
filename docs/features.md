# Mini Manager: Feature Cards

Oct 9, 2026 · @Mateus

Ten Feature cards: seven in full for the MVP and three shorter ones for later. All ten are approved; code follows these rules.

## Decisions behind these cards

Four conflicts in the original brief were resolved as follows.

| Conflict | What you wrote | Decision used in the cards |
| --- | --- | --- |
| Who edits | One shared collection, 300+ minis from different owners, "each Miniature belongs to a User", but also "Owner edits, Players view" | Two roles. **Admin** (you): edits everything, invites people. **Member**: sees the whole shared collection, adds minis they physically own, edits and deletes only their own. Alternative: only you edit and everyone else is read-only, which means you type in all 300+ minis yourself. |
| Photos in MVP | Photos marked MVP, but they are missing from your MVP requirements and from "MVP is done when" | Keep photos in the MVP, but limit to 3 per mini and build them last. If time runs short they are the first thing to slip to v1.1. |
| Game systems | You play D&D 5e, PF2e and other d20 systems, but asked to use only D&D | D&D 5e fields only (creature type, size, CR), with CR nullable. A spare `systemStats` field is reserved so PF2e level can be added later without a schema change. |
| AND / OR filters | Both | AND between different filters, OR inside one multi-select filter (Size = Small OR Medium, AND type = Humanoid). A full rule builder with nested groups waits for v1.1. |

The database choice (PostgreSQL) is covered in section 4 of `plan.md`.

## User accounts (MVP)

### Card 1. Invite and sign-up


**Goal / user story:** As the Admin, I want to invite people from my group by email so that only they can create an account.

**Inputs**

| Field | Type | Required |
| --- | --- | --- |
| email (invite) | string, email format | yes |
| role (invite) | enum: admin, member | yes, default member |
| displayName (sign-up) | string, 2 to 40 chars | yes |
| password (sign-up) | string, 8 to 72 chars | yes |

**Business rules**

1. Only an Admin can create, resend or cancel an invite.
2. An invite cannot be sent to an email that already belongs to a user (emails are compared lower-cased).
3. An invite token is random, single-use and expires 7 days after it is sent.
4. Resending an invite invalidates the previous token.
5. The sign-up email is taken from the invite and cannot be changed on the sign-up form.
6. Accepting an invite creates the user with the invite's role and logs them in.
7. The first Admin is created by a seed command, not through the UI.

**Validations and error messages**

- Email already registered: "This person already has an account."
- Expired, used or cancelled token: "This invite is no longer valid. Ask the admin for a new one."
- Weak password: "Password must be 8 to 72 characters."

**Edge cases:** an invite for the same email sent twice (the second replaces the first); the email service is down (the invite is saved and the admin can copy the link by hand); a user is deactivated and later re-invited (reactivate instead of creating a duplicate).

**Output / result:** the Admin sees the invite as Pending, Accepted or Expired in a Members page. The invitee receives an email with a sign-up link.

**Acceptance criteria**

1. Given I am an Admin, when I invite a new email, then a Pending invite appears and an email is sent.
2. Given an invite older than 7 days, when the invitee opens the link, then they see the "no longer valid" message.
3. Given a valid invite, when the invitee submits a name and valid password, then their account exists with the invite's role and they land on the miniature list.
4. Given I am a Member, when I call the invite endpoint, then I get 403.

**Depends on:** User, Invite entities; Card 4 (roles); an email-sending service.

**Extension points:** Google sign-in (later) accepts an invite by matching the Google email; a user cap for the free tier can be one check in rule 1.

### Card 2. Log in, log out, password reset


**Goal / user story:** As a user, I want to log in with email and password, log out, and reset a forgotten password so that my account stays mine.

**Inputs:** email (string, required), password (string, required); for reset: email, then token + new password.

**Business rules**

1. Login compares the email case-insensitively and the password against a bcrypt or argon2 hash; plain passwords are never stored or logged.
2. A failed login always shows the same message, whether the email exists or not.
3. After 5 failed logins for one email within 15 minutes, further attempts are refused for 15 minutes.
4. A successful login returns a short-lived access token (15 minutes) and a refresh token (7 days) in an httpOnly cookie.
5. Each refresh issues a new refresh token and revokes the old one.
6. Logout revokes the current refresh token.
7. A reset request always answers "If that email exists, we sent a link".
8. A reset token is single-use and expires after 1 hour.
9. Completing a reset revokes all of that user's refresh tokens (logs out every device).
10. A deactivated user cannot log in or refresh.

**Validations and error messages**

- Wrong email or password: "Email or password is incorrect."
- Locked: "Too many attempts. Try again in 15 minutes."
- Bad reset token: "This reset link is invalid or expired."

**Edge cases:** a reset requested twice (only the newest token works); a password changed on one device while another is logged in (the other is logged out on its next refresh); clock skew on token expiry (allow 30 seconds).

**Output / result:** after login the user sees the miniature list; after logout, the login page; after reset, the login page with "Password updated".

**Acceptance criteria**

1. Given valid credentials, when I log in, then I see the miniature list and stay logged in after a page reload.
2. Given 5 wrong passwords in a row, when I try a 6th time with the right password, then I see the lock message.
3. Given I logged out, when the old refresh token is replayed, then it is rejected with 401.
4. Given a reset link used once, when I open it again, then I see the invalid link message.

**Depends on:** User, RefreshToken, PasswordResetToken; email service.

**Extension points:** Google sign-in becomes a second login method on the same User; "remember me" only changes the refresh token lifetime.

### Card 3. Edit profile


**Goal / user story:** As a user, I want to change my display name and password so that the group recognises me and my account stays secure.

**Inputs:** displayName (string, 2 to 40 chars, optional); currentPassword (string, required only when changing password); newPassword (string, 8 to 72 chars, optional).

**Business rules**

1. A user can edit only their own profile.
2. Changing the password requires the correct current password.
3. Changing the password revokes all other sessions of that user.
4. Email cannot be changed in the MVP (it needs a verification flow); the Admin can fix it by hand if needed.
5. Display names do not need to be unique, because the owner filter shows name and email.

**Validations and error messages**

- Wrong current password: "Current password is incorrect."
- Name too short or long: "Name must be 2 to 40 characters."

**Edge cases:** saving with no changes (no-op, no error); new password equal to the old one (allowed).

**Output / result:** a "Profile saved" message; the new name appears as the owner on that user's minis.

**Acceptance criteria**

1. Given I am logged in, when I change my name, then my minis show the new owner name.
2. Given a wrong current password, when I try to change my password, then I see the error and the password is unchanged.
3. Given I changed my password on my laptop, when my phone refreshes its session, then it is logged out.

**Depends on:** Card 2.

**Extension points:** avatar photo and email change with verification in v1.1.

### Card 4. Roles and permissions


**Goal / user story:** As the Admin, I want members to manage only their own miniatures so that nobody edits or deletes someone else's collection by mistake.

**Inputs:** role (enum: admin, member) when inviting or changing a user; active (boolean) when deactivating.

**Business rules**

1. Every logged-in user can view every miniature in the shared collection.
2. A Member can create miniatures, which are owned by them.
3. A Member can edit or delete only miniatures they own.
4. An Admin can create, edit and delete any miniature, and can set any user as a miniature's owner.
5. Only an Admin can invite users, change roles and deactivate users.
6. There must always be at least one active Admin; demoting or deactivating the last one is refused.
7. Deactivating a user keeps their miniatures visible and still owned by them; an Admin can reassign them.
8. Permissions are checked on the server for every request; hiding a button in the UI is never the only check.

**Validations and error messages**

- Not allowed: 403 "You can only change your own miniatures."
- Last admin: "There must be at least one admin."

**Edge cases:** an Admin demotes themself (allowed if another Admin exists); a user's role changes while they are logged in (applies on their next token refresh, within 15 minutes).

**Output / result:** edit and delete buttons appear only on minis the user may change; a Members page for the Admin.

**Acceptance criteria**

1. Given I am a Member, when I open someone else's mini, then I see its details with no edit or delete buttons.
2. Given I am a Member, when I send a PUT for someone else's mini, then I get 403 and nothing changes.
3. Given I am the only Admin, when I try to demote myself, then it is refused.
4. Given an Admin deactivates Ana, when anyone filters by owner Ana, then her minis are still listed.

**Depends on:** User (role, active), Miniature (ownerId).

**Extension points:** a Viewer role (read-only) or per-mini "lend" permissions slot into one permission-policy module; feature flags can also be checked there.

## Miniatures (MVP)

### Card 5. Miniature catalog: add, edit, delete, list, details


**Goal / user story:** As a group member, I want to register each miniature I own with its game details so that everyone can see what the group has available.

**Inputs**

| Field | Type | Required |
| --- | --- | --- |
| name | string, 1 to 100 chars | yes |
| ownerId | user id | yes, defaults to me (only Admin may change it) |
| creatureType | enum: aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, undead | yes |
| size | enum: tiny, small, medium, large, huge, gargantuan | yes |
| challengeRating | number from the CR list (0, 1/8, 1/4, 1/2, 1 to 30), stored as decimal | no (nullable) |
| quantity | integer | yes, default 1 |
| paintStatus | enum: pre\_painted, hand\_painted, unpainted *(renamed from not\_painted / "Not painted", 2026-10-11)* | yes, default unpainted |
| tags | list of strings | no |
| storageLocation | string, up to 60 chars | no |
| manufacturer | string, up to 60 chars | no |
| notes | string, up to 1000 chars | no |

**Business rules**

1. Quantity is an integer from 1 to 999; a mini with none left is deleted, not set to 0, Show a message before deleting.
2. challengeRating, when present, must be one of the official 5e CR values.
3. Tags are trimmed, lower-cased and de-duplicated and in snake case or dash case; at most 20 tags, each 1 to 30 characters. Spaces become dashes and spaces around the namespace colon are dropped ("Goblin Boss" → `goblin-boss`, "Faction: Drow" → `faction:drow`); any other character outside a–z, 0–9, `-` and `_` is rejected. *(Clarified 2026-10-09.)*
4. Faction, weapon and armor are tags in the MVP (for example `faction:zhentarim`, `weapon:bow`), not separate fields.
5. Duplicate names are allowed, even for the same owner, because variants and different sculpts share names.
6. createdAt, updatedAt and createdBy are set by the server and cannot be sent by the client.
7. Editing uses a version number: an update carrying an outdated version is refused with 409, so two people never silently overwrite each other.
8. Delete is permanent, needs a confirmation in the UI, and also deletes the mini's photos.
9. Edit and delete follow Card 4 (owner or Admin only).
10. The list shows 24 minis per page by default, at most 100, sorted by name A to Z unless the user picks another sort.

**Validations and error messages**

- Missing name: "Name is required."
- Bad quantity: "Quantity must be a whole number from 1 to 999."
- Bad CR: "Pick a valid Challenge Rating."
- Tag too long or empty: "A tag must be 1 to 30 characters." *(Clarified 2026-10-11.)*
- Tag with other characters: "Use letters, numbers, - or _ in tags, with an optional namespace like faction:drow." *(Clarified 2026-10-11.)*
- More than 20 tags: "A miniature can have at most 20 tags." *(Clarified 2026-10-11.)*
- Version conflict: "Someone changed this miniature while you were editing. Reload to see their changes."
- Not found: 404 "This miniature no longer exists."

**Edge cases:** the owner is deactivated (mini stays, see Card 4); a mini is opened from a stale link after deletion (404 page with a link back to the list); a tag typed with different casing ("Goblin" and "goblin" become one tag); a large-base mini used for several creature types (pick the main type and add others as tags).

**Output / result:** list view shows photo thumbnail, name, size, type, CR, quantity, owner and paint status; details view shows every field and all photos.

**Acceptance criteria**

1. Given I fill name, type and size only, when I save, then the mini appears in the list owned by me with quantity 1 and status unpainted.
2. Given quantity 0 or 2.5, when I save, then I see the quantity error and nothing is saved.
3. Given two people open the same mini and both save, when the second one saves, then they get the conflict message.
4. Given I confirm a delete, when I return to the list, then the mini and its photos are gone.
5. Given 60 minis, when I open the list, then I see 24 and can page to the rest.

**Depends on:** Cards 2 and 4; Miniature, Tag, User.

**Extension points:** `systemStats` (empty object for now) holds PF2e level or other system data later; custom fields from section 6 plug in beside tags; soft delete can replace rule 8 when shareable lists arrive.

### Card 6. Search and filters


**Goal / user story:** As a player or DM, I want to filter the shared collection so that I can find the right minis for a session in seconds.

**Inputs (all optional, sent as URL query parameters)**

| Filter | Type | MVP |
| --- | --- | --- |
| q (name search) | text | yes |
| creatureType | multi-select | yes |
| size | multi-select | yes |
| crMin, crMax | CR values | yes |
| owner | multi-select of users | yes |
| paintStatus | multi-select | yes |
| tags | multi-select, with "match any" or "match all" | yes |
| storageLocation, manufacturer | multi-select | later |
| sort | name, challengeRating, createdAt (newest), size; each ascending or descending (a leading `-` means descending) | yes |

**Business rules**

1. Different filters combine with AND.
2. Values inside one multi-select filter combine with OR (size = small OR medium).
3. Tags default to "match any"; the user can switch to "match all".
4. Name search is case- and accent-insensitive and matches any part of the name ("gob" finds "Hobgoblin Captain").
5. crMin must be less than or equal to crMax; minis with no CR are excluded only when a CR filter is set.
6. The full filter state lives in the URL, so reload, back button and pasting a link reproduce the same results.
7. The result count is always shown.
8. Unknown filter parameters are ignored; invalid values for known filters return 400 with the field name.
9. Filtering and paging happen on the server, not in the browser.
10. Each filter is defined once in a filter registry, so the UI control, the URL parameter, the validation and the database query come from one definition.

*Clarified 2026-10-11:* the minimum-quantity filter and sorting by quantity were dropped; sorting by size was added
(the size enum is in size order for this). A multi-select repeats its parameter once per value
(`?size=small&size=medium`); owners are sent by user id; `tagMatch=all` switches tags to "match all" (default any).
The options in each filter show a count of matching minis in the whole Catalog; counts that follow the other active
filters ("faceted") are a later change.

**Validations and error messages**

- crMin above crMax: "Minimum CR cannot be higher than maximum CR."
- No results: "No miniatures match these filters." with a "Clear filters" button.

**Edge cases:** search text with special characters such as quotes or regex symbols (escaped, treated as plain text); a filter on a deactivated owner (still works); a tag removed from every mini (disappears from the tag picker); combining many filters on a phone (filters open in a bottom sheet with an "Apply" button).

**Output / result:** the list from Card 5, narrowed and sorted, with active filters shown as removable chips above it.

**Acceptance criteria**

1. Given minis of sizes small, medium and large, when I filter size = small, medium, then only small and medium minis appear.
2. Given I filter type = humanoid AND tags = goblinoid, when the list loads, then every result is a humanoid tagged goblinoid.
3. Given I filtered and paged to page 2, when I reload, then I see the same filters and page.
4. Given crMin = 5 and crMax = 2, when I apply, then I see the CR error.
5. Given I search "GOB", when the list loads, then "Hobgoblin" is included.

**Depends on:** Card 5; indexes defined in section 4.

**Extension points:** new filters are one registry entry (walkthrough in section 6); saved filter presets (v1.1) store the URL query; the encounter picker (Card 8) reuses the same registry.

### Card 7. Photos per miniature


**Goal / user story:** As a user, I want to attach photos to a mini so that people recognise the actual model when choosing.

**Inputs:** image files (JPEG, PNG or WebP), up to 3 per mini; which photo is the cover.

**Business rules**

1. A mini has 0 to 3 photos in the MVP.
2. Each file must be JPEG, PNG or WebP and at most 5 MB, checked by real file type, not by extension.
3. The first photo uploaded is the cover; the owner can pick another cover.
4. Each photo is stored in a thumbnail (about 400 px) and a full size (about 1600 px); location data (EXIF) is removed.
5. Only someone who can edit the mini (Card 4) can add, remove or reorder its photos.
6. Deleting a photo or its mini removes the files from storage.
7. Images are kept in an image storage service, never in the database; the database stores only the reference.
8. A mini with no photo shows a placeholder based on its size.

**Validations and error messages**

- Wrong type: "Use a JPEG, PNG or WebP image."
- Too big: "Images must be 5 MB or smaller."
- Too many: "A miniature can have up to 3 photos."

**Edge cases:** an upload fails halfway on mobile data (nothing is saved, retry allowed); the cover photo is deleted (the next photo becomes the cover); a phone photo taken sideways (rotated by its orientation data before EXIF is stripped).

**Output / result:** the cover thumbnail in the list, all photos in the details view, and a camera or gallery picker on phones.

**Acceptance criteria**

1. Given I edit my mini, when I upload a 3 MB JPEG from my phone, then it appears as the cover and the list shows its thumbnail.
2. Given a mini with 3 photos, when I try a 4th, then I see the limit error.
3. Given a 10 MB file, when I upload, then I see the size error and nothing is stored.
4. Given I delete a mini with photos, when the storage is checked, then its files are gone.

**Depends on:** Card 5; image storage choice in section 3.

**Extension points:** the photo limit is one setting; photo upload during CSV import (later) uses the same service.

## Later features

These cards are shorter on purpose: they fix the rules that shape the MVP data model now, and get their full detail when they move into a phase.

### Card 8. Encounter picker


**Goal / user story:** As a DM, I want to say "I need 4 medium goblinoids and 1 large boss" so that the app tells me which minis cover it.

**Inputs:** one or more requirement lines, each with count (integer 1 to 50, required) plus any filters from the Card 6 registry (size, type, tags, CR range, owner).

**Business rules**

1. Each line is matched with the same filter logic as Card 6.
2. A line is covered when the summed quantity of matching minis is at least its count.
3. One physical mini is counted for at most one line, so a goblin used in line 1 is not offered again in line 2.
4. Painted minis (pre-painted or hand-painted) are suggested before unpainted ones, then by owner present at the session (optional input).
5. A line that cannot be covered shows the shortfall ("3 of 4 found") and the closest alternatives (same type, one size off).

**Validations and error messages:** a line with no filters: "Add at least one filter to this line."

**Edge cases:** the same mini matches two lines (rule 3 assigns it to the first line that needs it); proxies (a user may mark "use as" substitutes later).

**Output / result:** a pick list grouped by line, with owner and storage location so each player knows what to bring.

**Acceptance criteria**

1. Given 3 medium goblinoid minis with quantity 2 each, when I ask for 4, then the line is covered.
2. Given only 2 large minis, when I ask for 3, then I see "2 of 3 found" and alternatives.

**Depends on:** Cards 5 and 6; the `quantity`, `size`, `creatureType`, `tags` and `storageLocation` fields.

**Extension points:** saving a pick as a private list (Card 10); PF2e level matching through `systemStats`.

### Card 9. Import and export CSV


**Goal / user story:** As the Admin, I want to import a spreadsheet of minis and export the collection so that I do not type 300 minis by hand and I always have a backup.

**Inputs:** a UTF-8 CSV file up to 2 MB and 2,000 rows; columns match Card 5 field names, tags separated by `;`.

**Business rules**

1. Import always runs a dry run first that shows rows to create, rows with errors and the reason per row.
2. Nothing is saved until the user confirms the dry run; then valid rows are saved together, or none if the import fails.
3. Members import into their own ownership; only an Admin may set an `owner` column.
4. Export returns the current filtered list (Card 6) or the whole collection, with photo URLs as a column.
5. Rows are matched by an optional `id` column: with an id, the row updates that mini; without one, it creates a new mini.

**Validations and error messages:** per row, the same messages as Card 5, prefixed with the row number ("Row 14: Quantity must be a whole number from 1 to 999").

**Edge cases:** Excel saving the file as Latin-1 or with `;` delimiters (detected and converted); an id belonging to someone else's mini (row error for Members).

**Output / result:** a summary ("212 created, 3 errors") and a downloadable error report.

**Acceptance criteria**

1. Given a CSV with 10 valid rows and 1 invalid, when I run the dry run, then I see 10 ready and 1 error with its reason, and nothing is saved.
2. Given I export with size = large applied, when I open the file, then it contains only large minis.

**Depends on:** Cards 5 and 6.

**Extension points:** a JSON full backup with photos uses the same export pipeline.

### Card 10. Private lists with a shareable link


**Goal / user story:** As a DM, I want to save a named list of minis for a session and share a link so that players see exactly what to bring.

**Inputs:** list name (string, 1 to 80 chars, required); items (mini id + count); notes (optional).

**Business rules**

1. A list belongs to the user who created it and is private by default.
2. Turning sharing on creates an unguessable link token; anyone with the link sees a read-only version, with no login needed.
3. Turning sharing off, or regenerating the link, makes the old link stop working at once.
4. An item's count cannot exceed the mini's quantity.
5. When a mini in a list is deleted, the list keeps a "removed miniature" line instead of breaking (this is why Card 5 may move to soft delete).
6. The shared view hides owner emails and notes marked private.

**Validations and error messages:** count above quantity: "Only 2 of this miniature exist." Revoked link: "This list is no longer shared."

**Edge cases:** a mini's quantity drops below a list's count (list shows a warning); the list owner is deactivated (link stops working).

**Output / result:** a list page with cover thumbnails and a copy-link button.

**Acceptance criteria**

1. Given a shared list, when a logged-out person opens the link, then they see the list read-only.
2. Given I regenerate the link, when someone opens the old one, then they see "no longer shared".

**Depends on:** Cards 4, 5 and 8.

**Extension points:** collaborative lists (other members can edit) and "bring list per player" grouped by owner.
