# Mini Manager

Invite-only web app where a D&D group (about 10 people) shares one catalog of 300+ physical miniatures
and filters it to pick minis for a session. Each mini belongs to the player who owns it. Mateus is the
Admin and the only developer; he is intermediate in JS/Python and **learning Go with this project**.

## Sources of truth, in order of precedence

The plan and the cards decide behaviour. The HTML files are visual references only. When they disagree, follow
the plan and say so in your summary.

| What | Where | Rule |
| --- | --- | --- |
| Business rules | `docs/features.md` (the 10 approved Feature cards; new cards go in `docs/features/card-NN-name.md`) | Code follows the cards. If a card is wrong or silent, stop and ask; do not invent rules. |
| Architecture, schema, endpoints, roadmap | `docs/plan.md` | Same. Update it when a decision changes. |
| Frontend rules | `docs/context.md` | Tailwind theme, component inventory, screens and routes. **Read it before any work in `web/`.** |
| Visual references | `docs/design/design-system.html`, `docs/design/screens.html` | Open in a browser to see components, states and screen layouts; take token values and measurements from them. Never copy their CSS, class names or JS, and never read business rules from them. |
| Lasting decisions | `docs/adr/NNNN-title.md` | Write a short ADR (context, decision, alternative, consequences) for any new library, pattern or deviation from the plan. |

Card numbers: 1 invite and sign-up, 2 login/logout/reset, 3 profile, 4 roles and permissions,
5 miniature catalog, 6 search and filters, 7 photos, 8 encounter picker (v2), 9 CSV (v1.1), 10 lists (v2).

## Stack

- **Backend:** Go 1.26 (set in `api/go.mod`), stdlib `net/http` routing, `pgx/v5`, `sqlc` for fixed queries, `squirrel` only for the
  filter query, `goose` migrations, `argon2id` passwords, `golang-jwt/jwt/v5`.
- **Frontend:** React 19 + Vite + TypeScript, React Router v8, TanStack Query, React Hook Form + Zod.
  Styling = Tailwind CSS v4 with the design-system tokens as its theme (no UI kit, no shadcn).
- **Data:** PostgreSQL (Neon free). **Images:** Cloudinary (signed direct upload). **Email:** Resend.
- **Hosting:** one Docker image on Render free tier; Go serves the API under `/api/v1` and the built SPA.
- **CI:** GitHub Actions: lint, test (with a real Postgres), build image, deploy on `main`.

Free tier only. Do not add a paid service or anything that needs a credit card.
If NestJS ever replaces Go (agreed fallback if Go stalls), the API contract and database stay the same.

## Layout

```text
api/
  cmd/server/      main: config, db, routes, serves web/dist
  cmd/seed/        creates the first Admin from env vars (idempotent)
  internal/platform/   config, db, httpx, auth, email, images, flags — no business rules
  internal/features/   auth, invites, users, miniatures, filters, photos
      <feature>/handler.go  service.go  queries.sql  service_test.go
  migrations/      goose SQL files
web/src/
  app/             router, providers, layout
  features/        auth, invites, profile, members, miniatures, filters, photos
  shared/          api client, design-system components, form helpers
  styles/app.css   Tailwind entry: @import "tailwindcss", @theme tokens, Paper/Lantern variables, @font-face
docs/  plan.md  features.md  context.md  features/  adr/  design/{design-system,screens}.html
```

## Commands

Keep this list accurate as the project grows. The Makefile reads `.env` (copy `.env.example`). Go tools are
pinned in `go.mod` and run as `go tool <name>` from `api/`; the web app uses Yarn 4 through corepack (Node 22,
`nvm use`).

```bash
make dev          # local db + api with live reload + vite dev server (vite proxies /api to :8080)
make db           # start the local Postgres 18 from compose.yaml on port 5433 (applies no migrations)
make test         # go test ./... (needs Docker for testcontainers) + yarn test
make lint         # sqlc diff, go vet, staticcheck, gofmt check, oxlint, tsc -b --noEmit
make sqlc         # regenerate Go code from queries.sql
make migrate-new name=add_x   # new numbered goose migration
make migrate-status           # applied and pending migrations (creates goose_db_version on a fresh db)
make migrate      # goose up against DATABASE_URL: Mateus only, after reviewing the migration (ADR 0002)
make seed         # first Admin from SEED_ADMIN_*: Mateus only
```

Never run `make migrate` or `make seed` against any database yourself; write the files and let Mateus apply them.

Run `make lint test` before saying a task is done, and report failures honestly.

## Backend rules

- **Layers:** handlers parse input and write responses; services hold every business rule; queries only touch
  data. Rules must be testable without HTTP.
- **Feature isolation:** a feature may import `platform/` and another feature's exported service, never its
  internals.
- **Permissions:** every "can user X do Y to Z" check goes through `features/users/policy.go`, enforced on the
  server for every request. Hiding a button is never the check.
- **Filter registry (Card 6):** each filter is one file in `features/filters/` implementing `Def()` and `Apply()`,
  registered in `init()`. Different filters AND; values inside one filter OR; tags support any/all.
  `GET /api/v1/filters` exposes the definitions so the UI renders controls without per-filter code.
- **API:** REST + JSON under `/api/v1`. Errors are RFC 9457 `application/problem+json` with a field-level `errors`
  list. Lists return `{ items, total, page, pageSize }` (default 24, max 100). Updates carry `version`; a stale
  version returns 409 (Card 5 rule 7). Unknown filter params are ignored; invalid values return 400.
- **Go style:** idiomatic and boring. Stdlib first, explicit error returns wrapped with `fmt.Errorf("...: %w", err)`,
  `context.Context` as first argument, no global state except the filter registry, small interfaces defined
  where they are used. Mateus is learning: prefer clear code over clever code, and when you use a Go idiom he
  may not know, explain it in one line in your summary, not in comments.

## Database rules

- `uuid` v7 ids, `timestamptz` everywhere, `citext` emails, Postgres enums for fixed sets.
- Enums: `user_role` (admin, member); `creature_size` (tiny … gargantuan, order matters for sorting);
  `creature_type` (14 D&D 5e types); `paint_status` (**pre_painted, hand_painted, unpainted**, default unpainted).
- Tags are `text[]` (trimmed, lower-cased, deduped, max 20) with a GIN index; not a Tag table.
- `name_search` (lower-cased, accents removed) is written by the service on every save; search uses `pg_trgm`.
- `system_stats` and `custom_fields` are JSONB and stay empty in the MVP.
- Tokens (invite, refresh, reset) are stored only as hashes.
- Migrations: never edit one that has run; fix forward. Renames use expand → backfill → switch → contract.
  Destructive migrations need Mateus's explicit OK.

## Auth and security

Access JWT 15 min in memory; refresh token 7 days in an httpOnly, Secure, `SameSite=Strict` cookie, rotated on
every refresh, reuse of a rotated token revokes the family. Login errors never reveal whether the email exists.
5 failed logins per email in 15 min locks it for 15 min. Password reset and invite tokens are single-use
(1 h and 7 days). Never log passwords, tokens or full emails. Secrets come from env vars only; never commit `.env`.

## Frontend and design rules

Full rules are in `docs/context.md`. The short version:

- Tailwind CSS v4 with a theme that contains **only** the design-system tokens (defaults removed). Paper and
  Lantern themes switch through CSS variables on `data-theme`; no `dark:` classes.
- No arbitrary values, no hex colours in components, no shadows, gradients or blur, corners 2 px or 0, 1 px rules.
- Archivo (variable, width axis) and IBM Plex Mono, self-hosted. Type styles are `type-*` utilities.
- Build the components in `web/src/shared/ui/` first; features compose them. One vermilion element per screen.
- One export per file, named exactly after it (`FieldError.tsx` → `FieldError`, `formatChallengeRating.ts` →
  `formatChallengeRating`);
  tests share the file's name. Each `shared/ui` component has its own folder with its tests and helpers;
  shared plumbing is in `shared/ui/internal/`. Details in `docs/context.md`.
- Clear, unabbreviated names for functions, props and parameters (`mergeClassNames`, not `cn`; `event`, not `e`),
  and an explicit return type on every declared function. Details in `docs/context.md`.
- Mobile first (390 px), table and filter rail from `md` up, touch targets ≥ 44 px on phones, status never colour
  alone, filters in the URL, and the waking-server banner for Render cold starts.

## Testing

- One test per numbered business rule, named after it: `TestCard5_Rule7_OutdatedVersionReturns409`,
  `it("card 6 rule 2: values inside one filter combine with OR")`.
- Go service tests run against real Postgres via testcontainers; no database mocks.
- Frontend: Vitest + Testing Library for components; Playwright for the main flows (accept invite → add mini
  → find it with two filters; Member cannot edit someone else's mini).
- Never skip, delete or weaken a test to make the suite pass.

## How to work in this repo

1. Work on one Feature card (or one step of the build order) at a time. Read the card first and list which rules
   the change implements.
2. Write or update the tests for those rules, then the code.
3. Ship unfinished features behind a flag in `feature_flags` (`GET /api/v1/flags` for the UI). Remove the flag
   once the feature is fully released.
4. Ask before adding a dependency, changing the schema of existing columns, changing an approved card's rule,
   or deviating from `docs/plan.md`. Record accepted deviations in an ADR.
5. Keep commits small with clear messages; do not push to `main` without being asked.
6. When done, summarise: what changed, which card rules are covered, test results, anything left open.

## Current phase: MVP

Build order: (1) skeleton: Go serves a blank SPA, Postgres, migration 0001, seed Admin, login/logout, deployed by
CI; (2) miniature CRUD with version check; (3) filter registry + 8 MVP filters in the URL; (4) roles, invites,
password reset email; (5) photos (max 3, 5 MB, JPEG/PNG/WebP); (6) phone polish.

Out of the MVP: lists and share links, Google login, CSV import/export, encounter picker, saved presets,
custom fields, storage location and manufacturer as filters. Do not build these unless asked.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `BarbieriM/MiniManager`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` at the repo root plus `docs/adr/`. See `docs/agents/domain.md`.
