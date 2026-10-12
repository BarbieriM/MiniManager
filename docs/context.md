# Frontend context: components and styling rules

Read this before any work in `web/`. It turns the plan and the two visual references into rules for the
React + Tailwind frontend.

## Precedence

1. **`docs/plan.md` and `docs/features.md` win.** Behaviour, validation, copy limits, roles, page sizes and scope
   come from them.
2. **`docs/design/design-system.html` and `docs/design/screens.html` are visual references only.** Open them in a
   browser to see how a component looks, which states it has and how a screen is laid out. Take token values and
   measurements from them. Do **not** copy their CSS, class names or JavaScript, and do not treat anything in them
   as a business rule.
3. When a reference disagrees with the plan, follow the plan and mention the difference in your summary. Known
   differences are listed at the end of this file.

## Stack

React 19 + Vite + TypeScript, React Router v8, TanStack Query, React Hook Form + Zod, **Tailwind CSS v4**
(CSS-first config, `@tailwindcss/vite`), `clsx` + `tailwind-merge` behind a `mergeClassNames()` helper. No component library,
no shadcn, no CSS-in-JS, no icon library.

## Tailwind setup (`web/src/styles/app.css`)

The theme contains only the design-system tokens. Tailwind's default palette, shadows, radii and fonts are
removed, so classes such as `bg-purple-500`, `shadow-lg`, `rounded-xl` or `font-sans` do not exist.

```css
@import "tailwindcss";

@custom-variant lantern (&:where([data-theme="lantern"], [data-theme="lantern"] *));

@theme {
  --color-*: initial;
  --shadow-*: initial;
  --inset-shadow-*: initial;
  --drop-shadow-*: initial;
  --radius-*: initial;
  --font-*: initial;

  --spacing: 4px;
  --radius-ds: 2px;
  --font-ui: "Archivo Variable", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "Courier New", monospace;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1440px;
}

/* Colours resolve through theme variables so Paper/Lantern switch without dark: classes */
@theme inline {
  --color-page: var(--bg-page);
  --color-raised: var(--bg-raised);
  --color-sunken: var(--bg-sunken);
  --color-ink: var(--ink-primary);
  --color-ink-2: var(--ink-secondary);
  --color-rule: var(--rule-default);
  --color-rule-strong: var(--rule-strong);
  --color-accent: var(--accent-vermilion);
  --color-on-accent: var(--ink-on-accent);
  --color-hand-painted: var(--status-hand-painted);
  --color-pre-painted: var(--status-pre-painted);
  --color-unpainted: var(--status-unpainted);
  --color-error: var(--feedback-error);
  --color-success: var(--feedback-success);
}

@layer base {
  :root, [data-theme="paper"] {
    color-scheme: light;
    --bg-page: #F3EFE6; --bg-raised: #FBF9F4; --bg-sunken: #E9E3D6;
    --ink-primary: #1B1A17; --ink-secondary: #5A564C;
    --rule-default: #D6CEBD; --rule-strong: #1B1A17;
    --accent-vermilion: #B73A1B;
    --status-hand-painted: #9A6B12; --status-pre-painted: #2C6A64;
    --status-unpainted: var(--ink-secondary);
    --feedback-error: var(--accent-vermilion); --feedback-success: #3F6B2E;
    --ink-on-accent: var(--bg-raised);
  }
  [data-theme="lantern"] {
    color-scheme: dark;
    --bg-page: #15140F; --bg-raised: #1E1C16; --bg-sunken: #0F0E0B;
    --ink-primary: #ECE5D5; --ink-secondary: #A8A091;
    --rule-default: #34312A; --rule-strong: #ECE5D5;
    --accent-vermilion: #E0623F;
    --status-hand-painted: #D6A84A; --status-pre-painted: #6FB1A8;
    --status-unpainted: var(--ink-secondary);
    --feedback-error: var(--accent-vermilion); --feedback-success: #8DBA74;
    --ink-on-accent: var(--bg-page);
  }
  html, body { @apply bg-page text-ink font-ui; }
  body { font-size: 15px; line-height: 22px; -webkit-font-smoothing: antialiased; }
  :focus-visible { outline: 2px solid var(--rule-strong); outline-offset: 2px; }
}
```

Theme choice: follow `prefers-color-scheme` on first visit, let the user switch in Profile, store it in
`localStorage`, set `data-theme` on `<html>` before React renders (inline script in `index.html`).

### Type styles

Define each as an `@utility` so family, weight, width axis, size, line height and tracking stay together.
Use these instead of combining `text-*`/`font-*`/`leading-*` by hand.

| Utility | Spec | Use |
| --- | --- | --- |
| `type-display` | Archivo 700, `font-stretch:125%`, 32/36 | Desktop page title, sentence case |
| `type-display-m` | Archivo 700, 125%, 26/30 | Mobile page title |
| `type-title` | Archivo 600, 112.5%, 20/26 | Sheet, dialog and section titles |
| `type-body` | Archivo 400, 15/22 | Default |
| `type-body-strong` | Archivo 600, 15/22 | Buttons, miniature names |
| `type-dense` | Archivo 400, 75%, 14/20 | Table cells, chips |
| `type-label` | Archivo 600, 11/14, uppercase, `letter-spacing:.08em` | Column headers, field labels, badges |
| `type-mono` | Plex Mono 500, 13/18 | CR, quantity, tags, counts, emails in lists |
| `type-mono-lg` | Plex Mono 600, 22/26 | Result count only ("48 minis") |
| `type-stamp` | Plex Mono 500, 11/1 | Owner stamp initials only (two letters in a 20 px box) |
| `type-wordmark` | Archivo 700, 125%, 20/24 | Wordmark text at its regular size |

Fonts are self-hosted: `@fontsource-variable/archivo/wdth.css` (needs the width axis) and `@fontsource/ibm-plex-mono`
weights 500 and 600. No Google Fonts request.

### Utility rules

- Spacing uses the 4 px scale but only steps 1, 2, 3, 4, 6, 8, 12 (4, 8, 12, 16, 24, 32, 48 px). Fixed sizes from
  the references are multiples of 4: `h-11` 44 px control and row, `h-14` 56 px header, `h-16` 64 px bottom bar,
  `size-18` 72 px thumbnail, `w-70` 280 px filter rail, `size-5` 20 px owner stamp, `size-4` 16 px base glyph.
- Radius: `rounded-ds` (2 px) on inputs, buttons, chips, pills, tags; nothing (0) on tables, sheets, cards, dialogs.
- Borders are always 1 px: `border-rule` for hairlines between rows, `border-rule-strong` for section rules,
  control borders, dialogs and sheets. Focus is the global 2 px outline; never remove it.
- **No arbitrary values** (`bg-[#B73A1B]`, `p-[13px]`, `rounded-[6px]`, `shadow-[...]`). If something is missing,
  add a token or `@utility` in `app.css` and say so in the summary. The one allowed exception is `grid-cols-[...]`
  for table column templates, defined once per table component.
- No `dark:` classes: themes switch through the variables. Use `lantern:` only for a real theme-specific tweak.
- No gradients, blur, backdrop filters, opacity scrims, transforms for decoration, or transitions longer than
  150 ms. `motion-reduce:` disables the skeleton shimmer and banner progress rule.
- Component class lists live inside `shared/ui` components. Feature code composes components; if a feature needs
  the same 5+ classes twice, it needs a component or a variant.

## Visual principles (from the references)

- "The quartermaster's ledger": dense, typographic, ruled, warm paper. The data is the decoration.
- **One vermilion element per screen**: the primary action, the active filter, or a destructive confirm. When a
  screen has its own primary button, the bottom bar's Add is drawn outlined. When a dialog or sheet is open, it owns
  the only vermilion and the page's primary goes outlined.
- Status is never colour alone: paint marks have a label or tooltip, pills have a mark, errors have an icon + text.
- Contrast: text 4.5:1, glyphs and control borders 3:1 (the reference page verifies the token pairs; do not add
  colours that would need re-checking).
- Overlays: 1 px `border-rule-strong`, a 16 px mat in the page colour, no scrim, no shadow.
- Mobile first at 390 px; desktop reference is 1440 px. `md` switches cards → table and sheet → filter rail.
- Touch: on phones every interactive target is ≥ 44 × 44, including tag and chip remove buttons, photo-slot tools
  and icons inside fields. Implement this as larger hit areas on mobile (`size-11 md:size-8`), not a global class.
  Desktop-only compact controls (32 px row actions, sort buttons, breadcrumbs) never render on phones.

**Never**: Inter/Poppins/Geist/system fonts, purple or blue-pink gradients, rounded cards with soft shadows,
pill-shaped everything, emoji icons, sparkle/AI badges, stat-tile dashboards, "Welcome back" headers, parchment
or fantasy kitsch, default shadcn/Material look.

## Folder layout

```text
web/src/
  styles/app.css            Tailwind entry, tokens, type utilities, fonts
  shared/ui/index.ts        barrel: features import components from here, never from a component's folder
  shared/ui/<Component>/    one folder per component: the component, its tests, and the pieces that exist
                            only to serve it (sub-components, its hook and context), e.g.
                            Field/ = Field.tsx, FieldError.tsx, FieldContext.ts, useField.ts, Field.test.tsx
  shared/ui/Icon/Icon.tsx   inline SVG icons redrawn from the reference (1.5 px stroke, 16/20 px)
  shared/ui/internal/       plumbing used by several components (control box classes, button classes, listbox
                            keyboard and popover pieces); not exported from index.ts except the Option and
                            CatalogItem types
  shared/lib/               one function per file with its test next to it
                            (formatChallengeRating.ts + formatChallengeRating.test.ts)
  test/                     Vitest setup and shared test helpers, one per file
  shared/lib/mergeClassNames.ts  clsx + tailwind-merge: joins class names, later Tailwind classes win
  shared/api/               fetch client, problem+json parsing, the slow-request tracker, TanStack Query keys
                            (queryKeys.ts). The refresh-and-retry on 401 lives in features/auth/components/AuthProvider,
                            because it needs the in-memory access token (decided 2026-10-11).
  app/                      router, providers, AppShell (appbar / mobile header / bottom bar / banners)
  features/<feature>/       one feature (auth, miniatures, filters, …); no styling primitives here. Its files are
                            split by kind, and a subfolder exists only once it has files:
    pages/                  screens the router mounts (CatalogPage.tsx)
    components/             pieces only this feature uses: dialogs, forms, controls (MiniatureForm.tsx)
    api/                    talking to the server: TanStack Query hooks, request functions, request and
                            response types (useMiniature.ts, requestLogin.ts, MiniatureListResponse.ts)
    lib/                    plain helpers, constants and context hooks (toCatalogItem.ts, useSession.ts)
```

## File naming: one export per file

Every file exports one thing and is named exactly after it, so the file tree is the index of the code.

- **Components:** one exported component per `.tsx` file, PascalCase: `FieldError.tsx` exports `FieldError`.
  Private helpers used only inside that file stay unexported.
- **Hooks:** one per file, named after the hook: `useToast.ts` exports `useToast`.
- **Functions:** one per `.ts` file, camelCase: `formatChallengeRating.ts` exports `formatChallengeRating`.
- **Contexts and standalone types:** named after the export: `FieldContext.ts`, `Option.ts`.
- **Allowed companions:** a file may also export the types and constants that exist only to serve its main
  export, e.g. `Icon.tsx` exports `IconName`, `addTag.ts` exports `maxTags` and `TagResult`. If something else
  starts using a companion on its own, move it to its own file.
- **Tests** sit next to the file they test and share its name: `formatChallengeRating.test.ts`, `Dialog.test.tsx`.
- **Folders:** each `shared/ui` component lives in its own folder named after it, with its tests and its
  helper files (see Folder layout). A stand-alone component that merely reuses another, like `PasswordInput`
  using `TextInput`, gets its own folder.
  Helpers shared by several tests live in `src/test/`, one per file.
- **Exceptions:** `index.ts` barrels (re-exports only), the entry point `main.tsx` and the Vitest `src/test/setup.ts`.
- **Checked by** `yarn lint` (`web/scripts/check-file-names.mjs`).

## Naming and return types

Names say what a thing is or does, in full words, so a reader never has to open a file to decode them.

- **No abbreviations or single letters:** `mergeClassNames`, not `cn`; `Quantity`, not `Qty`;
  `(event) =>`, not `(e) =>`; `(option) =>`, not `(o) =>`. Domain words come from `GLOSSARY.md`.
- **Functions are verbs or describe their result:** `formatChallengeRating`, `getPhotoError`, `nextActiveIndex`,
  `controlBoxClassName`. Event handlers are `handleKeyDown`, `toggleOption`, `closeMenu`.
- **Props and parameters are named for their meaning:** `creatureSize` (not `size` when a size of something
  else is possible), `matchingCount`/`catalogTotal` (not `count`/`total`), `errorMessage`, `helpText`.
- **Booleans read as yes/no:** `isLoading`, `isCurrentUser`, `isCover`, `showProgress`, `fullWidth`,
  `twoColumns`. Standard HTML names stay as they are (`disabled`, `readOnly`, `checked`, `open`, `invalid`).
- **Every declared function has an explicit return type:** components return `ReactElement`
  (or `ReactElement | null`), hooks and helpers declare theirs (`: void`, `: string`, `: FieldContextValue | null`).
  Inline callbacks passed straight to a prop or argument (`onClick={() => …}`) are typed by where they are
  passed and need none. Enforced by oxlint's `typescript/explicit-function-return-type`.

## Component inventory (`shared/ui`)

Build these first, each with a typed props API, every state from the design system, and a Vitest + Testing
Library test for behaviour (not snapshots). Keep variant styles in a `variants` object keyed by prop value.

### Signature glyphs

| Component | Props | Look |
| --- | --- | --- |
| `BaseGlyph` | `creatureSize: 'tiny'…'gargantuan'`, `size?: 'icon' \| 'placeholder'` | 16 px SVG square: footprint on the 5 ft grid scaled into the box (Tiny quarter cell, Small dot in one cell, Medium full cell, Large 2×2, Huge 3×3, Gargantuan 4×4). `aria-label` = size word. Also used large as the no-photo placeholder. |
| `ChallengeRatingStamp` | `challengeRating: number \| null` | Plex Mono 13 in a 1 px `border-rule-strong` box, h-5, px-2: `CR 1/4`, `CR 5`, `CR —`. Format 0.125/0.25/0.5 as fractions. |
| `PaintMark` | `status: 'pre_painted' \| 'hand_painted' \| 'unpainted'`, `showLabel?` | 10 px circle: hand-painted filled `bg-hand-painted`, pre-painted half-filled `pre-painted`, unpainted empty outline `border-unpainted`. Without label it gets a tooltip and `aria-label`. |
| `OwnerStamp` | `initials`, `isCurrentUser?`, `size?: 'sm' \| 'lg'` | 20 px square, 1 px border, Plex Mono 11; `isCurrentUser` = filled ink with page-colour text. `lg` = 64 px, Plex Mono 22, used once on Profile. |
| `Quantity` | `quantity` | `×4` in `type-mono`, right-aligned, min width 48 px so ×999 lines up with ×1. |
| `Wordmark` | `size?: 'md' \| 'lg'` | "Mini Manager" in `type-display` width; the M drawn on a 2×2 base-glyph grid (SVG). |

### Controls

| Component | Variants and states |
| --- | --- |
| `Button` | `variant: primary` (bg-accent, text-on-accent) `\| secondary` (ink outline) `\| quiet` (text only) `\| destructive` (accent outline) `\| confirm` (destructive filled, only inside a confirm dialog); `size: md` (h-11, px-6) `\| sm` (h-8, desktop only); `icon` slot; states hover, pressed (ink fill, page text), focus, disabled, `loading` (keeps width, shows progress rule). Text in `type-body-strong`. |
| `IconButton` | 44 × 44 default, `sm` 32 × 32 for desktop table rows only; requires `label` for `aria-label`. |
| `Field` | Wraps label (`type-label`), control, help line, error line. Error = accent border + icon + message, never colour alone. |
| `TextInput`, `PasswordInput` (show/hide), `SearchInput` (clear) | h-11, `bg-raised`, 1 px `border-rule-strong`, `rounded-ds`, px-3. States: empty, filled, focus, error, disabled, **read-only** (`bg-sunken`, `text-ink-2`, plus a line saying who can change it). |
| `NumberStepper` | Quantity 1–999, typing allowed, invalid values show the Card 5 message. |
| `Select`, `MultiCombobox` | Typeahead, counts in mono, keyboard navigable (listbox pattern). |
| `ChallengeRatingRange` | Two selects of official CR values; min > max shows "Minimum CR cannot be higher than maximum CR." |
| `TagInput` | Autocomplete from `GET /tags`; tags render as `Tag` (h-7, Plex Mono 13, `namespace:value` with the namespace in `text-ink-2`), lower-cased on entry, max 20. |
| `Textarea` | Counter (notes ≤ 1000). |
| `Segmented` | Two-way (Match any / Match all) and three-way (paint status in forms: Unpainted / Pre-painted / Hand-painted). Equal segments, selected = ink fill. Never a dropdown for three options. |
| `Checkbox`, `CheckboxList` | List rows with counts in mono, ≥ 44 px rows on phone. |
| `FileDrop` / `PhotoSlot` | 128 px slot: empty (base glyph), uploading (progress), uploaded, cover badge (`type-label` on ink), error with optional Retry and Dismiss; tools are 44 px on phone. |
| `Tabs` | Ink underline on the current tab, never colour. |
| `StepIndicator` | Later only (CSV import). |

### Feedback and overlays

| Component | Notes |
| --- | --- |
| `Toast` | min-h-12, `bg-raised`, 1 px ink border, success/error icon + text; sits above the pinned action bar on mobile. |
| `Banner` | Full-width `bg-sunken` strip with ink rules: **waking server** ("Waking the server. This can take up to a minute.") with a quiet progress rule, and **offline**. Shown by `AppShell` when the first request is slow or fails offline. |
| `MessageBox` | Form-level message: `kind: error \| ok \| info`, 4 px left edge in the feedback colour + icon. |
| `NotePanel` | Quiet explanation, no status (e.g. "You can view this miniature. Only Rafa or an admin can edit or delete it."). |
| `Dialog` | 440 px max, `bg-raised`, 1 px ink border, p-6, gap-4, focus trapped, Esc closes (except while saving). Used for delete confirm, version conflict (Reload only), role change, deactivate, last-admin error. |
| `Sheet` | Mobile bottom sheet for filters and actions; sticky footer button ("Show 48 minis"). |
| `Skeleton` | Rows made of rules, not grey blobs; mobile version matches the card (outlined 72 px box + three rules). |
| `EmptyState` | One line, one sentence, one action, a single ink line drawing of a base glyph. |
| `StatusPill` | Invite status only: Pending (dashed outline + open circle), Accepted (check), Expired (clock), Cancelled (cross). All ink. |
| `LinkBox` | Mono link truncated in the middle with Copy inside the box (invite link when email is down). |
| `PageBody` | The padded column under a logged-in screen's header: sections 24 px apart, 16 px gutters on phones, 24 px on desktop. |
| `AuthLayout` | The logged-out screens (log in, accept invite, forgot and reset password): wordmark panel on desktop, one 420 px column with title and intro. |

### Catalog and layout pieces

| Component | Notes |
| --- | --- |
| `CatalogTable` | Desktop default. 44 px rows, `border-rule` between rows, `border-rule-strong` on top. Columns: cover, name, size (glyph + word), type, CR, paint, owner, qty, location, actions. Sortable headers with direction indicator. Row actions (edit, delete) appear on hover/focus **only if the policy allows** (own mini or admin). Selected row `bg-sunken`. Horizontal scroll under 1040 px. |
| `CatalogCard` | Mobile list item: 72 px thumb, name (`type-body-strong`), base glyph, CR stamp, paint mark, owner stamp, qty; ≥ 96 px tall, whole card is the link. |
| `GridTile` | Photo-first desktop alternative, toggled from the page header (`?view=grid`): square cover or size placeholder with the Owner stamp, name, size and quantity; the whole tile is the link. No CR stamp or paint mark (decided 2026-10-12). |
| `TileGrid` / `ViewToggle` | The photo grid's columns (3, then 4 at `lg`, 5 at `xl`) and the Table/Photo grid toggle in the Catalog's page header (desktop only). |
| `CoverThumbnail` | Fills its box with a Miniature's cover thumbnail, or the size placeholder without one (Card 7 rule 8); used by the table, the cards and the tiles. |
| `SectionHeading` | `type-title` heading of one section of a screen, with the id the section names itself by (Photos, Users, Invites). |
| `FilterRail` (desktop, 280 px) and `FilterSheet` (mobile) | Render controls from `GET /api/v1/filters` definitions (Card 6); groups collapse; active filters appear as `FilterChip`s above results with "Clear all". Chip hover for removal turns accent. `shared/ui/FilterRail` is the column frame; the phone sheet is a `Sheet`; `features/filters` draws the controls. |
| `FilterGroup` | One filter in the rail or sheet: groups sit flush, split by a `border-rule` line; the heading (`type-label`, 44 px) has a chevron on the right and opens or closes the controls. |
| `FilterChipRow` | Wrapping row of `FilterChip`s and "Clear all" above the results. |
| `Toolbar` | Above the Catalog: the search, plus Filters and Sort side by side on phones. |
| `Pagination` | "1–24 of 312" in mono, previous/next, page jump. |
| `ResultCount` | `type-mono-lg`: "48 minis" or "48 of 312 minis". |
| `AppBar` (desktop) | Wordmark, Catalog, Members (admins only), profile menu (Profile, Change password, Log out). h-14, ink rule below. |
| `MobileHeader` | h-14; top-level screens show the wordmark, deeper screens a 44 px back link naming the destination, at most one action on the right. |
| `BottomBar` (mobile) | h-16, three items: Catalog, Add, Profile. Add is the only vermilion item unless the screen has its own primary. Hidden on forms and on details for owners/admins. |
| `StickyActionBar` (mobile) | Bottom, ink rule above: Save on forms; Edit + Delete on details for owners/admins. |
| `Breadcrumbs`, `PageHeader` (desktop) | Last crumb is not a link; header holds display title, one mono meta line, the single primary action. |
| `DefinitionList` | Details page "ledger entry": small-caps label left, value right, hairline between rows. |
| `PhotoViewer` | One large photo with cover badge and "1 / 3" count, row of 72 px thumbs; current thumb has a 2 px ink border; no photo shows the base glyph + "No photo yet". |
| `DataRow` / `MobileListRow` | Members and invites: 56 px ruled rows with a mono email line; on phones stacked with full-width action buttons. `DataTable` takes a `label` that names the table for screen readers. |
| `RowLinkList` | Profile links on phone (Change password, Members for admins, Log out): 48 px rows with chevron. |

## Screens and routes (MVP)

Each route has the states shown in `screens.html`. Copy, limits and rules come from the cards.

| Route | Screen | Required states |
| --- | --- | --- |
| `/login` | Log in | wrong credentials, locked (15 min), loading |
| `/forgot-password` | Request reset | confirmation ("If that email exists…") |
| `/reset-password?token=` | Set new password | invalid/expired link |
| `/invite/:token` | Accept invite | email read-only, expired/used invite, success → catalog |
| `/` | Catalog (home) | table / grid (desktop), cards (mobile), filters open, CR error, empty first use, no results, loading, end of list |
| `/minis/new` | Add miniature | required name, type, size first; defaults qty 1, unpainted |
| `/minis/:id` | Details | owner/admin (Edit, Delete) vs other member (note panel, no actions) |
| `/minis/:id/edit` | Edit | inline errors, owner select for admins only (members get no owner field at all; decided 2026-10-10), version conflict dialog, quantity 0 offers "Delete this miniature instead" |
| `/minis/:id` (deleted) | Not found | link back to catalog |
| `/profile`, `/profile/password` | Account | saved toast; wrong current password; success ("other devices were logged out") |
| `/admin/members` | Members (admin) | invite dialog/sheet, email already registered, sent but email down (LinkBox), change role, deactivate, last-admin error |
| any admin route as member | 403 | link back |
| global | Waking-server and offline banners | |

Filters, sort and page live in the URL query (Card 6). Page size is 24 everywhere, including the photo grid.
Members is in the desktop app bar; on mobile it is a row in Profile.

Not in the MVP (do not build unless asked): encounter picker, CSV import, lists and public list view, saved filter
presets. `screens.html` shows them in block F with a "Later" strip.

## Accessibility checklist per component

Keyboard reachable in visual order; visible focus; labels on every control; `aria-live="polite"` for toasts and
result counts; dialogs trap focus and restore it; tooltips also work on focus; touch targets as above; works at
200 % zoom without horizontal scroll except the catalog table.

## Known differences between references and plan (plan wins)

| Topic | Reference says | Follow |
| --- | --- | --- |
| Password length | screens assume at least 10 characters | Plan/Card 1: **8 to 72** characters |
| Owner stamp initials | screens: derived at invite and editable in Profile | Plan has no initials field: **derive from display name** (first letters of first two words, else first two letters), not editable. Ask Mateus before adding a field. |
| Photo grid page size | screens: 15 per page | Plan: **24** per page everywhere |
| Delete button on details | outlined destructive; vermilion again at confirm | Keep as the design system shows; the API rules are unchanged |
| Later block (F) | full mid-fidelity screens | Out of MVP scope |
| Error state on controls | 2 px vermilion border | **1 px** `border-accent` (borders are always 1 px); the icon + message carry the error |
| CR range error copy | "Minimum CR must not be above maximum." | Card 6: **"Minimum CR cannot be higher than maximum CR."** |
| Drop zone hint | "JPG or PNG, up to 5 MB" | Card 7: **JPEG, PNG or WebP**, up to 5 MB |
| Pre-painted mark | CSS gradient half-fill | Same look drawn in **SVG** (no gradients) |
| Skeleton rules | ink rules at 45 % opacity | **Solid** `bg-rule-strong` lines (no opacity effects), no shimmer |
| Tooltips | native `title` attribute | `Tooltip` component that also opens on keyboard focus |
