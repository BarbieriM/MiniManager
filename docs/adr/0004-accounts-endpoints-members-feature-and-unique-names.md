# 0004. Account endpoints, the members feature and unique display names

Date: 2026-10-12 · Status: accepted

## Context

Build step 4 (`specs/step-4-accounts.md`) adds Invites, Password reset, the profile and the Members page (Cards 1
to 4). Four things in it differ from `docs/plan.md` or the approved cards:

- **Change password endpoint.** The plan lists `POST /me/password`. Card 3 rule 3 keeps the current Session and
  ends the others, so the server must know which Session made the request. Only the refresh cookie says that, and
  it is limited to `/api/v1/auth` (ADR 0002), so the browser never sends it to `/me`.
- **Where deactivating lives.** The plan puts Card 4 in `users`. Deactivating must also end the User's Sessions,
  which belong to `auth`, and `auth` already imports `users`, so `users` cannot import `auth`.
- **Duplicate display names.** Card 3 rule 5 allowed them because "the owner filter shows name and email". The
  owner filter and owner select built in steps 2 and 3 show only the name, so two people with the same name could
  not be told apart.
- **Paging the admin lists.** CLAUDE.md says lists return 24 per page by default. The Members page lists about 10
  Users and their Invites.

## Decision

- Changing a password is `POST /api/v1/auth/password`: a logged-in request (Bearer token) that also carries the
  refresh cookie.
- A small `members` feature serves the Members page. It runs one transaction in which `users` changes the Role or
  active state (with the last-Admin rule) and `auth` ends a deactivated User's Sessions, so a failure undoes both.
- Display names are unique ignoring case (Card 3 rule 5 changed with Mateus's OK on 2026-10-11), enforced by a
  unique index on `lower(display_name)` in migration 00003. A clash is the field error "Someone in the group already
  uses this name."
- `/admin/users` and `/admin/invites` use the list envelope but return every row on one page, like
  `/users/options` and `/tags` already do.

## Alternatives

- **Session id in the access token**, keeping `/me/password`. It changes every token and the middleware for one
  endpoint.
- **A cookie path covering `/me`.** The refresh token would then travel with more requests than it needs to.
- **A callback from `users` into `auth`**, wired after both are built. It hides the dependency and splits the
  transaction.
- **Showing the email next to duplicate names** (the card's original idea). It needs a second line in
  `CheckboxList` and `Select`, and owner stamps would still look the same.
- **Paging the admin lists now.** It adds controls the Members page does not need at this size.

## Consequences

- The plan's endpoint table and repo layout name `/auth/password` and `members/`.
- Renaming someone to a name in use fails on save; existing databases need distinct names before migration 00003
  runs, which holds for the local database (only the seeded Admin).
- If the group grows past about 100 people, the admin lists need paging.
