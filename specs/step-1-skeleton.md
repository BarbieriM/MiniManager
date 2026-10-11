# Spec: Step 1, the skeleton

Build order step 1 from `docs/plan.md`: Go serves a blank SPA, Postgres, migration 0001, seed Admin, log in and
log out, deployed by CI. It covers Card 2 rules 1 to 6 and rule 10.

## Problem Statement

Mini Manager has docs, a design system and an empty Go module, but nothing runs. There is no database, no way for
the Admin to exist, no way to log in, and nothing deployed. Every later step (miniatures, filters, invites,
photos) needs a logged-in User and a deployed app to build on, so until this skeleton exists no feature can be
built or tried by the group.

## Solution

A single deployed app, reachable at one URL, where the Admin (created once by a seed command) can log in with
email and password, stay logged in across page reloads, and log out. After logging in, the Admin lands on an
empty Catalog page. The app wakes from a Render cold start with a visible banner instead of a blank screen.
Every push to `main` is linted, tested against a real Postgres, built into a Docker image and deployed.

Nothing changes a real database's schema automatically. Mateus reviews each migration and applies it by hand.

## User Stories

1. As the Admin, I want my account created by a seed command, so that the first User exists without a public
   sign-up page (Card 1 rule 7).
2. As the Admin, I want the seed to do nothing if my email already exists, so that running it twice is safe and
   never overwrites my password.
3. As the Admin, I want the seed to reject a password outside 8 to 72 characters or a name outside 2 to 40
   characters, so that the seeded account follows the same limits as invited Users.
4. As the Admin, I want the seed to refuse to run when the database schema is behind, so that it never writes to
   a half-migrated database.
5. As a User, I want to log in with my email and password, so that I can reach the Catalog.
6. As a User, I want my email matched regardless of letter case, so that `Mateus@x.com` and `mateus@x.com` are
   the same login (Card 2 rule 1).
7. As a User, I want my password stored only as an argon2id hash, so that a database leak does not reveal it
   (Card 2 rule 1).
8. As a User, I want the same "Email or password is incorrect." message for a wrong password and an unknown
   email, so that nobody can discover which emails have accounts (Card 2 rule 2).
9. As a User, I want unknown emails to take as long to reject as wrong passwords, so that response time does not
   reveal which emails have accounts.
10. As a User, I want an email locked for 15 minutes after 5 failed logins within 15 minutes, so that my password
    cannot be guessed by brute force (Card 2 rule 3).
11. As a User, I want the lockout to apply to unknown emails too, so that "Too many attempts" never reveals that
    an email has an account.
12. As a User, I want a successful login to clear my failed attempts, so that old typos do not count against me.
13. As a locked-out User, I want to see "Too many attempts. Try again in 15 minutes.", so that I know to wait.
14. As a User, I want to stay logged in after reloading the page, so that I do not log in on every visit (Card 2
    acceptance criterion 1).
15. As a User, I want my Session to last 7 days from my last visit, so that playing weekly keeps me logged in
    (Card 2 rule 4).
16. As a User, I want every refresh to replace my refresh token, so that a stolen old token is useless (Card 2
    rule 5).
17. As a User, I want the reuse of an already-replaced refresh token to end that whole Session, so that a thief
    holding a copied token is logged out together with me.
18. As a User, I want two tabs opened at the same moment not to log me out, so that normal use never looks like
    token theft.
19. As a User, I want to log out and have my refresh token revoked, so that the device can no longer act as me
    (Card 2 rule 6).
20. As a User, I want logging out to work even when my access token has expired, so that logging out can never
    get stuck.
21. As a User, I want a replayed refresh token rejected with 401 after I log out (Card 2 acceptance criterion 3).
22. As a deactivated User, I cannot log in or refresh (Card 2 rule 10), and I see the same "Email or password is
    incorrect." message as anyone else.
23. As the Admin, I want role changes and deactivation to take effect on the User's next request, so that a
    demoted or deactivated User does not keep powers for 15 minutes.
24. As a User, I want the login and refresh responses to include my id, display name and Role, so that the app
    knows who I am right after a reload.
25. As a User on a phone, I want the login screen to work at 390 px wide with touch targets of at least 44 px.
26. As a User, I want the login screen to show a loading state while it waits, so that I do not press the button
    twice.
27. As a User opening the app after it has slept, I want a "Waking the server. This can take up to a minute."
    banner, so that I know the app is not broken.
28. As a logged-out User opening the Catalog, I want to be sent to the login screen, so that only Users see the
    Catalog.
29. As a logged-in User, I want to land on an empty Catalog page after login, so that I know where the miniatures
    will appear.
30. As a logged-in User, I want a log out action in the app bar, so that I can leave from any page.
31. As Mateus, I want the server to refuse to start when required config is missing or `JWT_SECRET` is shorter
    than 32 bytes, so that a misconfigured deploy fails loudly instead of running insecurely.
32. As Mateus, I want the server to refuse to start when the database has pending migrations, so that a forgotten
    migration never breaks the live app (Render keeps the previous version running).
33. As Mateus, I want migrations applied only when I run `make migrate`, so that I review every schema change
    before it touches a database.
34. As Mateus, I want one command to start the local database, the API with live reload and the Vite dev server,
    so that local work is quick.
35. As Mateus, I want `make test` and `make lint` to run the same checks as CI, so that a green local run means a
    green CI run.
36. As Mateus, I want every push to `main` to lint, test, build the image and deploy to Render, so that deploys
    are repeatable.
37. As Mateus, I want a step-by-step wizard for creating the Neon, Render and GitHub secrets setup, so that I can
    do the account steps that only I can do.

## Implementation Decisions

### Scope

- Card 2 rules 1 to 6 and 10. Password reset (rules 7 to 9) waits for build step 4, because it needs email.
- Card 2 is copied to `docs/features/card-02-login.md` when work starts, as the plan asks.

### Migrations and the review gate

- Migration 0001 contains only what step 1 uses: the `citext` extension, the `user_role` enum, `users`,
  `refresh_tokens` and `login_failures`. Miniatures, invites, photos and feature flags get their own migrations
  in the steps that need them. This replaces the plan's single `0001_init.sql`.
- **Nothing applies migrations automatically.** The server and the seed never run `goose up`.
- On startup the server compares the database's schema version with the migrations built into the binary and
  refuses to start if any are pending, naming them. The seed does the same check.
- `make migrate` is the only way to apply migrations to a real database. Mateus runs it, locally and against
  Neon, after reviewing the migration file. Against Neon, it runs before merging a PR that contains a migration.
- **Order of work:** the migration file is written first and handed to Mateus for review. No test that touches
  Postgres runs, and no local database is started, until he approves it. Service tests then apply the migration
  only to a throwaway testcontainers Postgres that is deleted after each run.
- The agent never runs `make migrate` or `make seed` against any database. It only writes the files.

### Schema (migration 0001)

- `users`: as in the plan (`id`, `email` citext unique, `password_hash`, `display_name`, `role`, `active`,
  timestamps), **without** `failed_logins` and `locked_until`.
- `refresh_tokens`: as in the plan, plus `session_id` (uuid, groups every token issued for one Session).
  Columns: `id`, `user_id` (cascade delete), `session_id`, `token_hash` unique, `expires_at`, `revoked_at`,
  `replaced_by`, `created_at`.
- `login_failures`: `email` citext, `failed_at` timestamptz, indexed on (`email`, `failed_at`). No foreign key,
  because unknown emails are recorded too.
- Ids are uuid v7 generated in Go. Production and tests use Postgres 18.

### Login and lockout

- Every attempt adds a `login_failures` row before anything is checked. It is refused when the email then has
  more than 5 rows in the last 15 minutes, whether or not a User has that email. Refused attempts keep their row,
  so the lock lasts 15 minutes after the latest attempts (Card 2 rule 3). A successful login deletes that email's
  rows. Recording first stops parallel guesses from slipping past the lock.
- Passwords over 72 characters are refused (401) before argon2 runs.
- Unknown emails run a dummy argon2id verification, so they take as long as a wrong password.
- A deactivated User gets the same "Email or password is incorrect." message.
- Responses use RFC 9457 problem+json:
  - Wrong credentials: **401** with "Email or password is incorrect."
  - Locked: **429** with "Too many attempts. Try again in 15 minutes." and a `Retry-After` header with the
    seconds until the lock ends.

### Sessions and tokens

- A **Session** (see `GLOSSARY.md`) is one login on one device. Login starts a Session and issues its first
  refresh token.
- Refresh tokens are random, stored only as hashes, last 7 days and are sliding: each refresh issues a new token
  with a new 7 days and revokes the old one.
- Reuse of a rotated token:
  - Within 30 seconds of its rotation: 401, Session untouched. The client retries the refresh once with the
    new cookie, which covers two tabs refreshing at once.
  - After 30 seconds: 401, and every token in that Session is revoked.
- A refresh for a deactivated User fails with 401.
- Logout needs only the refresh cookie. It revokes the current token, always returns 204 and always clears the
  cookie, even if the token is unknown or already revoked.
- The access token is an HS256 JWT signed with `JWT_SECRET`, valid 15 minutes with 30 seconds of clock-skew
  leeway. It carries only the user id.
- A middleware loads the User's Role and active flag from the database on every authenticated request. A
  deactivated User's requests get 401.
- The refresh cookie is `HttpOnly`, `Secure` (also in dev; use Chrome locally), `SameSite=Strict` and scoped to
  `Path=/api/v1/auth`.

### API contract

| Method | Path | Auth | Result |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | none | 200 `{ accessToken, expiresIn, user: { id, displayName, role } }` and sets the cookie; 400, 401, 429 |
| POST | `/api/v1/auth/refresh` | cookie | 200 with the same body and a new cookie; 401 |
| POST | `/api/v1/auth/logout` | cookie | 204 and clears the cookie |

Every other path outside `/api/v1` serves the built SPA, with `index.html` as the fallback for client routes.

### Config and seed

- Server config comes from env vars `DATABASE_URL`, `JWT_SECRET` (at least 32 bytes) and `PORT`. Anything
  missing or invalid stops startup with a clear message.
- The seed reads `DATABASE_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_ADMIN_NAME`. It validates
  them with Card 1's limits, does nothing if the email exists, and never logs the password.
- Mateus runs the seed from his laptop against Neon, so the Admin password never sits in Render's env vars.

### Modules

- **Platform config:** reads and validates env vars.
- **Platform db:** pgx pool, plus the "pending migrations" check, with the migrations embedded in the binary.
- **Platform httpx:** JSON and problem+json helpers, plus the auth middleware.
- **Platform auth:** argon2id hash and verify, JWT issue and verify, random token generation and token hashing.
  It holds no business rules.
- **Feature auth:** the login, refresh and logout service holding Card 2 rules 1 to 6 and 10, its sqlc queries
  and its handler.
- **Users feature:** user lookup used by login, the seed and the middleware. `policy.go` stays empty until roles
  are enforced in step 4.
- **Server command:** wires config, db, routes and the SPA.
- **Seed command:** creates the Admin.
- **Web:**
  - An auth provider that keeps the access token in memory, refreshes on load and retries a refresh once on 401.
  - An API client that attaches the token.
  - `/login`, built from the existing `shared/ui` components (Field, TextInput, PasswordInput, Button,
    MessageBox).
  - A protected `/` with an EmptyState.
  - AppShell with AppBar logout and the waking-server Banner.

### Local dev, build and CI

- A `compose.yaml` runs `postgres:18` on Colima for local dev.
- A git-ignored `.env`, with a committed `.env.example`, feeds the Makefile through `-include .env` and `export`.
  No dotenv library.
- The Makefile provides `dev`, `test`, `lint`, `sqlc`, `migrate-new`, `migrate` and `seed`.
- A multi-stage Dockerfile builds the web app, then the API, and copies `web/dist` into the image.
- GitHub Actions on every push and PR: lint, then tests (Docker is available on GitHub runners), then a Docker
  build. On `main` it then calls the Render deploy hook (a GitHub secret). Render builds the Dockerfile itself,
  with auto-deploy off.
- Go libraries added in this step, as listed in the plan: pgx/v5, goose/v3 as a library, x/crypto, jwt/v5,
  google/uuid, testcontainers-go with its postgres module.

### Docs

- **ADR 0002** records:
  - The `login_failures` table instead of counters on `users`.
  - Sessions with a sliding 7 days.
  - The 30-second reuse grace window.
  - Manual-only migrations with a startup check.
- **`docs/plan.md`** is updated: per-step migrations, manual migrate instead of "deploy runs goose up", and the
  schema changes above.
- **CLAUDE.md commands** are kept accurate.

## Testing Decisions

- A good test checks behaviour someone can observe, such as what a login returns, which Sessions survive or what
  the screen shows, never internal calls or SQL shape. One test per numbered rule, named after it, for example
  `TestCard2_Rule3_FiveFailuresIn15MinutesLockTheEmail`.
- **Seam 1, the auth service (main seam):** Go tests call the service directly against real Postgres in
  testcontainers. They cover every in-scope Card 2 rule and decision, among them:
  - Case-insensitive email.
  - The same error for unknown, wrong and deactivated.
  - Lockout counting, including unknown emails, and the window expiring.
  - A successful login clearing failures.
  - Rotation, reuse within and after the grace window.
  - Logout revoking the token.
  - A deactivated User failing refresh.
  - Seed idempotency and validation.

  Time is controlled by passing a clock into the service, not by sleeping.
- **Seam 2, the HTTP router (thin):** a few `httptest` tests check the wire contract only:
  - Status codes 401 and 429.
  - The `Retry-After` header and problem+json body.
  - Cookie attributes and path.
  - Logout always returning 204.
  - SPA fallback.
  - The middleware rejecting a deactivated User.
- **Seam 3, the web auth flow:** Vitest and Testing Library tests render the router at a path, with `fetch`
  stubbed:
  - Login shows wrong-credentials, locked and loading states.
  - A reload with a valid cookie lands on `/`.
  - A logged-out visit to `/` goes to `/login`.
  - A 401 refresh is retried once.
  - Logout returns to `/login`.
  - The waking banner appears on a slow first request.
- **Prior art:** the `shared/ui` component tests and the `renderAtPath` helper in `web/src/test`. There are no Go
  tests yet; these will be the first.
- **Startup checks:** config validation and the pending-migrations refusal get small Go tests.
- Playwright starts with the step 4 flows (accept invite onward). The login flow is covered by seams 1 to 3.

## Out of Scope

- Password reset and every email feature (Card 2 rules 7 to 9), planned for step 4.
- Invites and sign-up (Card 1), roles enforcement and `policy.go` rules (Card 4), profile (Card 3): step 4 or
  later.
- Miniatures, filters and photos: steps 2, 3 and 5.
- The feature flags table and `GET /api/v1/flags`, added when the first flagged feature exists.
- The 403 page and any admin-only screen.
- Playwright end-to-end tests.
- Applying any migration to any database, and running the seed. Mateus does both by hand.
- Google login, "remember me", rate limiting by IP.

## Further Notes

- **Before tests can run**, Mateus installs a Docker runtime: `brew install colima docker docker-compose`, then
  `colima start`. His local Go is 1.24.4; `go.mod` pins 1.26, which Go downloads automatically.
- **No Render or Neon accounts exist yet.** The deploy commit comes with a `wizard` script that walks through:
  - Creating the Neon project on Postgres 18.
  - Creating the Render web service from the Dockerfile with auto-deploy off.
  - Adding the deploy hook as a GitHub secret.
  - Setting `DATABASE_URL` and `JWT_SECRET` on Render.
  - Running `make migrate` and `make seed` against Neon.
- **Work plan:** branch `step-1/skeleton`, one PR once CI passes. Commits in order:
  1. Config, db, migration 0001, compose, Makefile. **Stop here for the migration review.**
  2. Platform auth.
  3. Seed.
  4. The auth feature with tests.
  5. Web login, auth provider and banner.
  6. Dockerfile, CI and the wizard.
- If a test reveals that a card rule is wrong or silent, work stops and Mateus is asked. No rule is invented.
