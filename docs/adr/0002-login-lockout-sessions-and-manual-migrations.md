# 0002. Login lockout table, Sessions and manual migrations

Date: 2026-10-10 · Status: accepted

## Context

Build step 1 (`specs/step-1-skeleton.md`) implements Card 2 rules 1 to 6 and 10. Four details in `docs/plan.md`
either broke a card rule or would cause problems in normal use:

- The plan stored `failed_logins` and `locked_until` on `users`. An unknown email can then never be locked, so
  "Too many attempts" appears only for real accounts and reveals which emails exist (against Card 2 rule 2). A
  counter on the row also cannot measure "5 failures within 15 minutes" (rule 3).
- CLAUDE.md says reuse of a rotated refresh token revokes "the family", but nothing in the schema groups tokens,
  and the card does not say whether the 7 days restart on each refresh.
- The access token lives only in memory, so every reload or new tab calls refresh. Two tabs opened together send
  the same refresh token; the second looks like reuse and would log the User out.
- The plan ran `goose up` on deploy. Render's free plan has no pre-deploy step, so that would mean migrating at
  server startup, and Mateus wants to review every migration before it touches a database.

## Decision

- **Lockout:** a `login_failures` table (email, failed\_at) with no foreign key. Every login attempt is recorded
  **before** anything is checked: a wrong password, an unknown email, a deactivated User and an attempt refused
  while locked all leave their row. An attempt is refused when the email then has more than 5 rows in the last 15
  minutes. A successful login deletes that email's rows. Recording first means parallel guesses see each other's
  rows and cannot slip past the lock. Recording refused attempts means the lock lasts until 15 minutes after the
  latest attempts, as Card 2 rule 3 says ("further attempts are refused for 15 minutes"); `Retry-After` gives the
  exact time left. Passwords over 72 characters are refused before argon2 runs. Unknown emails also run a dummy
  argon2id check, so timing reveals nothing either. Deactivated Users get the same "Email or password is
  incorrect." message.
- **Sessions:** a Session (see `GLOSSARY.md`) is one login on one device. `refresh_tokens.session_id` groups
  every token of a Session. Refresh tokens are sliding: each refresh issues a new token with a fresh 7 days.
  Reusing a token rotated more than 30 seconds earlier revokes the whole Session.
- **Grace window:** reusing a token rotated less than 30 seconds earlier returns 401 without revoking anything.
  The client retries the refresh once with the new cookie.
- **Manual migrations:** nothing applies migrations automatically. Mateus runs `make migrate` after reviewing a
  migration, against Neon before merging the PR that contains it. On startup the server and the seed compare
  the database's version with the migrations embedded in the binary, and refuse to run if any are pending.
  Tests apply migrations only to throwaway databases: testcontainers databases for the Go tests, and
  `mini_manager_e2e` on the local compose Postgres for the end-to-end tests (`scripts/e2e.sh` creates it fresh and
  drops it after every run; amended 2026-10-14). A database someone keeps is never migrated by a test.

## Alternatives

- **Counters on `users`, as the plan said.** Simpler, but it leaks which emails exist and does not implement a
  15-minute window.
- **A fixed 7-day Session from login.** Weekly players would be logged out mid-session for no security gain in a
  10-person invite-only app.
- **No grace window.** It is strictly by the book, but opening two tabs would log people out regularly.
- **Migrate at server startup.** Fully automatic, but a bad migration would run on production with no review,
  which Mateus explicitly does not want.

## Consequences

- `login_failures` gains a row per failed or refused attempt, including for made-up emails. The service deletes
  rows older than 15 minutes for an email when it records a new attempt, so the table stays tiny.
- Someone who keeps guessing keeps a real User locked out. Accepted for an invite-only group of about 10.
- A thief who replays a stolen token within 30 seconds of its rotation is refused but does not trigger a Session
  revocation. Accepted: the token is still useless to them, and the next replay after 30 seconds revokes the
  Session.
- Each deploy that adds a migration has one manual step: run `make migrate` against Neon before merging. If it is
  forgotten, the new version fails to start and the previous one keeps serving.
