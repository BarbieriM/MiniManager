# Spec: Step 5, photos

Build order step 5 from `docs/plan.md`: up to 3 Photos per Miniature (Card 7) and the Catalog's photo grid on
desktop. Decisions were made in the planning session of 2026-10-12 (questions Q1 to Q23); Cards 6 and 7 carry dated
"clarified" notes for them, and ADR 0005 records how uploads work.

## Problem Statement

The Catalog lists 300+ Miniatures by name, size and Challenge Rating, but many look alike on paper: three "Goblin"
entries from three Owners, or a "Hobgoblin Captain" nobody remembers. A DM choosing minis for a session cannot see
which physical model is which, and the MVP's definition of done ("create a mini with a photo") is not met.

## Solution

On a Miniature's edit page, its Owner (or an Admin) adds up to 3 Photos. On a phone the picker offers the camera or
the photo library. Each Photo uploads as soon as it is picked, with a progress bar, and the first one becomes the
cover; another can be made the cover, and Photos can be removed after confirming. Sideways phone photos come out
upright, and location data never leaves the phone's file in public.

The Catalog shows each mini's cover thumbnail (or its size placeholder) in the table and the phone cards. On
desktop, a toggle switches the table to a photo grid. The details page shows every Photo large, with thumbnails to
switch between them.

## User Stories

### Adding Photos

1. As an Owner, I want to add a Photo to my mini, so that the group recognises the actual model (Card 7 goal).
2. As an Owner on a phone, I want to take the Photo with the camera or pick it from my library (Card 7 output).
3. As an Owner, I want each Photo to upload as soon as I pick it, without pressing Save.
4. As an Owner, I want to see how far an upload has got, so that I know to wait on slow phone data.
5. As an Owner, I want the first Photo I add to become the cover (Card 7 rule 3, acceptance criterion 1).
6. As an Owner, I want "Use a JPEG, PNG or WebP image." for any other file, even one renamed to `.jpg` (rule 2).
7. As an Owner, I want "Images must be 5 MB or smaller." for a bigger file, with nothing stored (rule 2,
   acceptance criterion 3).
8. As an Owner, I want "A miniature can have up to 3 photos." when I try a 4th (rule 1, acceptance criterion 2).
9. As an Owner whose upload failed halfway, I want to retry, with nothing half-saved (Card 7 edge case).
10. As an Owner, I want a sideways phone photo to show upright (Card 7 edge case).
11. As an Owner, I want location data removed from my Photos (rule 4).
12. As an Owner, I want to land on my new mini's details page with "Add photos" after creating it.

### Managing Photos

13. As an Owner, I want to make another Photo the cover (rule 3).
14. As an Owner, I want to remove a Photo after confirming "Remove this photo? This cannot be undone."
15. As an Owner, I want the next Photo to become the cover when I remove the cover (Card 7 edge case).
16. As an Admin, I want to manage the Photos of any mini (rule 5, Card 4 rule 4).
17. As a Member, I want no photo tools on someone else's mini, and 403 if I call the API anyway (rule 5, Card 4
    rule 8).
18. As an Owner, I want a removed Photo's file deleted from storage (rule 6).
19. As an Owner, I want deleting my mini to delete its Photos' files too (rule 6, acceptance criterion 4).
20. As an Owner editing my mini's name while a Photo uploads, I want neither to block the other.

### Seeing Photos

21. As a DM, I want each mini's cover thumbnail in the Catalog table and the phone cards (acceptance criterion 1).
22. As a DM, I want a mini without Photos to show a placeholder drawn from its size (rule 8).
23. As a DM, I want the details page to show every Photo large, with "1 / 3" and thumbnails to switch.
24. As a DM on a desktop, I want to switch the Catalog to a photo grid, so that I pick minis by how they look.
25. As a DM, I want each grid tile to show the cover (or placeholder), the Owner, the name, the size and the
    quantity, and open the mini when clicked.
26. As a DM, I want the grid view kept in the URL, so that reload, Back and a pasted link keep it.
27. As a DM in grid view, I want a Sort select, since the grid has no column headers.
28. As a DM, I want the grid to keep the filters, the page and 24 minis per page.

### Running without Cloudinary

29. As Mateus developing locally without a Cloudinary account, I want the app to run with Photos off: no photo
    section, placeholders everywhere, and "Photos are not set up" from the API.

## Implementation Decisions

### Cards as clarified on 2026-10-12

- **Card 7 rule 4:** a Photo is *available* as a thumbnail (about 400 px) and a full size (about 1600 px). The
  original is stored as uploaded, so the server checks its real type and size; both sizes are made from it when
  shown, upright and without metadata. The Cloudinary account has strict transformations on, so the original
  itself is never delivered (changed after the code review, ADR 0005).
- **Card 7 rule 5:** Photos keep the order they were added. There is no reordering; the cover is chosen.
- **Card 7:** the server checks the real file type and size after the upload, and Photo links are public but
  unguessable.
- **Card 6:** the desktop photo grid, kept in the URL as `view=grid`.

### Image storage (platform)

- **Cloudinary, called with plain HTTP** (no SDK, as the plan says), behind a small interface used by the photos
  feature:
  - Sign an upload for one exact name that cannot overwrite an existing file.
  - Look up a stored image's real format, size in bytes, width and height.
  - Delete one image, and delete every image of one Miniature (its folder).
  - Build the delivery links for the thumbnail and the full size.
- **Names:** `minis/{miniatureId}/{photoId}`, chosen by the API. Only a name the API signed can be registered.
- **Configuration:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`, all or none.
  With none, Photos are off and the server still starts. `.env.example` documents them.
- **Secrets:** the API secret only signs on the server; it never reaches the browser or the logs.

### Photos (Card 7)

- **Feature:** a photos feature with its own service, handler and queries. It uses the miniatures feature's
  exported service to find a Miniature and its Owner, and `policy.go` for who may change it.
- **Signing an upload:**
  - Only someone who can change the Miniature (`CanChangeMiniature`).
  - Refused when the Miniature already has 3 Photos, for quick feedback.
  - Returns what the browser needs to upload: the upload address, the name, the signature and its fields.
- **Registering an upload:**
  - Looks up the stored image. Not JPEG, PNG or WebP, or over 5 MB: the file is deleted and the Card 7 message
    returned.
  - In one transaction that locks the Miniature's row: counts the Photos (refused at 3, deleting the file), and
    saves the Photo at the next position. The first Photo becomes the cover.
- **Making a cover:** one cover per Miniature; the old cover stops being one in the same transaction.
- **Removing:** deletes the row, makes the next Photo the cover when the cover was removed, then deletes the file.
  A storage failure is logged and the removal still succeeds.
- **Deleting a Miniature:** its Photo rows go with it (the database cascades); the miniatures service then deletes
  its folder in storage, logging a failure without undoing the delete. The miniatures feature gets this through a
  small interface, so it does not depend on Cloudinary.
- **Version:** Photo changes never bump the Miniature's `version` (Card 5 rule 7 is about the form's fields).
- **Off:** with no Cloudinary settings, every photo endpoint answers "Photos are not set up" (503).

### API

| Method | Path | Who | Result |
| --- | --- | --- | --- |
| POST | `/miniatures/{id}/photos/signature` | Owner, Admin | upload address, name, signature fields |
| POST | `/miniatures/{id}/photos` | Owner, Admin | the registered Photo; Card 7 messages as field errors |
| PATCH | `/miniatures/{id}/photos/{photoId}` | Owner, Admin | `{ "isCover": true }` makes it the cover; the Photos |
| DELETE | `/miniatures/{id}/photos/{photoId}` | Owner, Admin | 204 |

- **Miniature responses:**
  - The details response gains `photos` (id, thumbnail and full-size links, cover flag, in order) and
    `photosEnabled`.
  - Each list item gains `coverThumbnailUrl`, null without Photos, read in the same query as the page.
- **Errors:**
  - Not allowed: 403 with the Card 4 message.
  - An unknown Photo: 404.
  - Limit, type or size: 400 with the Card 7 message.
  - Photos off: 503.

### Migration 00004

- **`photos`, as in the plan:**
  - id; the Miniature, deleted with it; the storage name; width, height and bytes.
  - Position 0 to 2, unique per Miniature.
  - A cover flag, with at most one cover per Miniature (partial unique index).
  - Creation and update times.
- **Nothing in existing tables changes.** As with every migration, it is written first and Mateus reviews it before
  anything runs, tests included (ADR 0002).

### Web

- **Upload helper:** one small module uploads a file to Cloudinary with `XMLHttpRequest`, reporting progress. It is
  the only place that does not use `fetch`.
- **Edit page, Photos section:**
  - Three `PhotoSlot`s: uploaded Photos in order, then empty slots up to 3.
  - Picking a file checks it in the browser first (`getPhotoError`), then signs, uploads with the percentage, and
    registers.
  - A failure shows the slot's error with Retry; a retry signs again.
  - Each uploaded slot has "Set as cover" and "Remove photo". Remove asks in a `Dialog` first.
  - The file input accepts images without `capture`, so phones offer the camera and the library.
  - Hidden when Photos are off or the User cannot change the mini.
- **Details page:** `PhotoViewer` with every Photo, or the placeholder and "No photo yet". The Owner (or an Admin)
  sees "Add photos", which leads to the edit page's Photos section. Creating a mini still lands here.
- **Catalog:**
  - The table and the phone cards show the cover thumbnail or the size placeholder (Card 7 rule 8).
  - **Grid view (desktop):**
    - A two-button toggle (Table view, Photo grid view) in the page header writes `view=grid`. Table is the
      default and leaves it out. Phones always show cards.
    - A new `shared/ui` component, `GridTile`: the square cover or placeholder with the Owner stamp, then the name,
      the size and the quantity. The whole tile links to the details page. Columns fit the width; the page holds 24.
    - In grid view, the Sort select shows in the desktop toolbar too.
- **Query keys:** Photo changes refresh that Miniature's details and the Catalog pages.

### No feature flag

The step is complete when merged, and nothing is deployed (as in steps 3 and 4). Photos are simply off where
Cloudinary is not configured.

## Testing Decisions

- **One test per rule, named after it,** for example `TestCard7_Rule1_AFourthPhotoIsRefused` and
  `it("card 7 rule 8: a mini without photos shows its size placeholder")`.
- **Fakes:** a fake image store records signs, lookups and deletions and returns chosen image details (format,
  bytes). It is the only stand-in, because storage is an outside service. The database is never faked.
- **Seam 1, the services against real Postgres (testcontainers):**
  - **Card 7:**
    - Rules 1 to 3, 5 and 6, and acceptance criteria 2 to 4.
    - Wrong type and too big, both deleting the file.
    - A name the API did not sign is refused.
    - The cover moving on removal.
    - Two registrations at once against the limit.
  - Photos off.
  - No `version` change.
- **Seam 2, the HTTP router:**
  - 403 for a Member on someone else's mini.
  - The Card 7 messages as problem+json.
  - 503 when Photos are off.
  - `coverThumbnailUrl` in the list and `photos` in the details.
- **Seam 3, the web flows with `fetch` stubbed** (and `XMLHttpRequest` stubbed for the upload):
  - Upload with progress, landing as the cover.
  - The browser-side type, size and limit messages.
  - A failed upload and its retry.
  - Set as cover; remove after confirming.
  - The details viewer; the placeholder.
  - The grid toggle in the URL with its Sort select.
  - No photo tools for a Member on someone else's mini; no section when Photos are off.
- **The Cloudinary client:** against a fake HTTP server, like the Resend client: signing, lookup, deleting one
  image and a folder, and the delivery links.
- **Prior art:** step 4's email client and outbox tests, and step 2's miniatures tests. The helpers are `dbtest`,
  `stubFetch`, `renderAppAt`, `miniatureFor` and `sessionFor`.

## Out of Scope

- **Reordering Photos:** dropped from Card 7 rule 5.
- **Private photo links:** links are public but unguessable.
- **A Cloudinary account and the deploy:** Mateus creates the account; deploying stays out, as in earlier steps.
- **Photo upload during CSV import:** Card 9, v1.1.
- **The grid view on phones:** phones keep the cards.
- **Cleaning up files that were uploaded but never registered,** beyond deleting a Miniature's folder.
- **Feature flags.**

## Further Notes

- **Free-plan limits** (storage, monthly credits, the largest upload Cloudinary accepts) are from memory and should
  be checked when the account is created, as `docs/plan.md` warns.
- **Without an account,** everything except uploading can be built and tested with the fake image store; a manual
  run needs the three Cloudinary settings in `.env`.
- **Further gaps:** any card gap found while building stops work for a question.
