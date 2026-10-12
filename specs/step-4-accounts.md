# Spec: Step 4, accounts

Build order step 4 from `docs/plan.md`: roles enforced, invites, password reset by email, and edit profile. It covers
Card 1 (invite and sign-up), the reset part of Card 2, Card 3 (edit profile) and the rest of Card 4 (roles and
permissions). Decisions were made in the planning session of 2026-10-11 (questions Q1 to Q22), and the cards carry
dated "clarified" notes for them.

## Problem Statement

Mateus is the only User. The seed command made him, and nobody else can get in: there is no way to invite the
group, so the Catalog only ever holds his minis. A User who forgets their password is locked out for good. Nobody can
change their display name or password. Mateus cannot make someone else an Admin, or switch off the account of a
Player who leaves the group.

## Solution

On a Members page, the Admin invites Players by email, choosing Admin or Member. The invitee gets an email with a
sign-up link, valid for 7 days. When email cannot be sent (no verified domain yet, or Resend is down), the Admin copies
the link from the invite dialog and sends it themselves. Opening the link shows the invite's email; the invitee picks a
display name and a password and lands in the Catalog, logged in.

The Members page lists every User and every Invite. The Admin can change a User's Role, deactivate them (they can no
longer log in, but their minis stay theirs) and reactivate them, and can resend or cancel Invites. The group always
keeps at least one active Admin.

Anyone can ask for a Password reset from the login page. If the email belongs to an active User, a 1-hour link
arrives; setting a new password logs them out everywhere. On their Profile, each User can change their display name
and their password.

## User Stories

### Invites (Card 1)

1. As the Admin, I want to invite a Player by email, so that only my group can join (rule 1).
2. As the Admin, I want to choose the invite's Role, Member by default, so that I can add a second Admin.
3. As the Admin, I want the invite email sent for me, so that I do not have to write it.
4. As the Admin, I want the invite link shown with a Copy button right after I send it, so that I can pass it on by
   chat when the email does not arrive.
5. As the Admin, I want to be told clearly when the email could not be sent, so that I know to send the link myself.
6. As the Admin, I want "This person already has an account." when I invite a registered email, so that nobody gets a
   second account (rule 2).
7. As the Admin, I want inviting a Deactivated User's email to point me to Reactivate, so that they keep their minis.
8. As the Admin, I want a new invite to an email with a Pending invite to replace it, so that only the latest link
   works.
9. As the Admin, I want to resend an invite, which kills the old link and gives a fresh 7 days (rule 4).
10. As the Admin, I want to cancel a Pending invite, so that its link stops working.
11. As the Admin, I want every invite listed as Pending, Accepted, Expired or Cancelled, newest first, so that I know
    who still has to join.
12. As an invitee, I want to see the email I was invited with, read-only, so that I sign up with the right address
    (rule 5).
13. As an invitee, I want to pick my display name and password and land in the Catalog logged in (rule 6, acceptance
    criterion 3).
14. As an invitee, I want "This invite is no longer valid. Ask the admin for a new one." for an expired, used or
    cancelled link (acceptance criterion 2).
15. As someone already logged in who opens an invite link, I want to be asked to log out first, so that I never switch
    accounts without noticing.
16. As a Member, I want the invite endpoints to refuse me with 403 (acceptance criterion 4).

### Password reset (Card 2)

17. As a User who forgot my password, I want to ask for a reset link by email from the login page.
18. As anyone, I want the same "If that email exists, we sent a link" answer for every email, so that the page never
    reveals who has an account (rule 7).
19. As a User, I want only my newest reset link to work, and only once, for 1 hour (rule 8).
20. As a User, I want setting a new password to log me out of every device (rule 9) and to show "Password updated" on
    the login page.
21. As a User who was locked out after wrong passwords, I want a completed reset to let me log in straight away.
22. As a User, I want "This reset link is invalid or expired." for a used or old link (acceptance criterion 4).
23. As a User, I want at most 3 reset emails per hour sent to me, so that nobody can flood my inbox.
24. As a Deactivated User, I want a reset request to send nothing, because I cannot log in anyway (rule 10).

### Profile (Card 3)

25. As a User, I want to change my display name, so that the group recognises me (rule 1).
26. As a User, I want my new name to show as the Owner of my minis (acceptance criterion 1).
27. As a User, I want "Someone in the group already uses this name." when the name is taken, ignoring case (rule 5,
    changed 2026-10-11).
28. As a User, I want to change my password by giving my current one (rule 2, acceptance criterion 2).
29. As a User, I want changing my password to log out my other devices but keep me logged in here (rule 3, acceptance
    criterion 3).
30. As a User, I want saving an unchanged profile to just succeed.

### Members page (Card 4)

31. As the Admin, I want to see every User with their Role, active ones A to Z, then Deactivated ones, so that I know
    who is in the group.
32. As the Admin, I want to change a User's Role (rule 5).
33. As the Admin, I want "There must be at least one admin." when I demote or deactivate the last active Admin
    (rule 6, acceptance criterion 3).
34. As the Admin, I want to demote myself while another Admin exists.
35. As the Admin, I want to deactivate a User, which logs them out at once and keeps their minis in the Catalog
    (rules 5 and 7, acceptance criterion 4).
36. As the Admin, I want "Ask another admin to deactivate you." when I try to deactivate myself.
37. As the Admin, I want to reactivate a Deactivated User, who then logs in with their old password.
38. As a Member, I want no Members link anywhere, and 403 from every admin endpoint (rule 8).
39. As the Admin on a phone, I want Members as a row on my Profile page.
40. As a User whose Role was changed, I want it to apply on my next request.

## Implementation Decisions

### Cards as clarified on 2026-10-11

- **Card 1:** re-inviting a Deactivated User is refused, with Reactivate instead; an invite has four statuses; the
  link is shown to the Admin right after Send or Resend; a logged-in visitor must log out to accept.
- **Card 2:** 3 reset emails per User per hour; unknown and Deactivated emails send nothing; a completed reset clears
  the login lockout.
- **Card 3 rule 5 changed:** display names are unique, ignoring case.
- **Card 4:** Reactivate is added; deactivating ends Sessions; an Admin cannot deactivate themself; Role and active
  changes apply on the next request (the API already reloads the User on every request).
- **Build order:** Card 3 joins step 4 in the plan and CLAUDE.md.

### Email (platform)

- **Sender:** a small email interface with two implementations, chosen from configuration:
  - Resend, called over plain HTTP (no SDK, as the plan says), used when its API key is set.
  - An outbox that writes each email as a file to a git-ignored folder, for local development without a key.
- **Configuration:** the server needs either the Resend key or the outbox folder, plus the sender address and the
  app's base URL for building links. `.env.example` documents all four.
- **Format:** plain text only: one short message for an invite and one for a reset, each with the link and when it
  expires.
- **Never logged:** tokens, links and full emails. A failed send is logged without them.

### Invites (Card 1)

- **Feature:** a new invites feature with its own service, handler and queries. It uses the users feature's exported
  service to create the User and check emails, and the auth feature's exported service to start the new User's
  Session.
- **Tokens:** random, stored only as a hash, single-use, expiring 7 days after they were last sent.
- **Statuses:** Pending, Accepted, Cancelled, or Expired. Expired is worked out from the expiry date, not stored.
- **Sending** (Admin only):
  - It refuses an email with an active User (rule 2) and a Deactivated User's email (Reactivate instead).
  - It replaces a Pending invite to the same email.
  - It saves the invite before sending the email, so a failed send keeps the invite.
- **Resend:** a new token and a fresh 7 days, keeping the Role; the old link dies. It works on Pending and Expired
  invites.
- **Cancel:** works on Pending and Expired invites.
- **The Admin's result** after Send or Resend carries the full link and whether the email went out. This is the only
  time the link exists outside the email.
- **Accepting:**
  - Checks the token, the display name rules (2 to 40 characters, unique ignoring case) and the password (8 to 72).
  - In one transaction: creates the User with the invite's email and Role, and marks the invite Accepted. A second
    accept of the same token fails.
  - Starts a Session like a login (rule 6).
  - If the email got an account in the meantime, the invite is no longer valid.

### Password reset (Card 2)

- **Where:** in the auth feature, next to login.
- **Request:**
  - The answer is always the same.
  - Only an active User gets a token and an email, and only while they have had fewer than 3 reset tokens in the last
    hour.
  - A new token makes that User's older unused ones invalid (only the newest works).
- **Confirm:**
  - The token must be the newest, unused and under 1 hour old (30 seconds of clock skew allowed).
  - It sets the password, marks the token used, revokes all of the User's Sessions (rule 9) and clears the
    login-lockout rows for that email.

### Profile (Card 3)

- **Read and edit:** a User reads and edits only their own profile, through the "me" endpoints.
- **Name changes** check the same rules as sign-up. Saving without changes succeeds.
- **Password change** needs the current password, and revokes every other Session of that User. The Session making
  the request is kept, so the request must say which Session it is: the refresh cookie identifies it.

### Members (Card 4)

- **Admin endpoints:** the users feature gets the list, the Role change, and deactivate/reactivate.
- **Every check in `policy.go`:**
  - Only Admins manage Users and Invites.
  - The last active Admin cannot be demoted or deactivated.
  - Nobody deactivates themself.
- **The last-Admin check** runs in the same transaction as the change, so two Admins demoting each other at once
  cannot leave the group with none.
- **Deactivating** sets the User inactive and revokes all their Sessions. **Reactivating** sets them active again; no
  Session comes back.
- **The list:** active Users A to Z, then Deactivated ones, each with Role and email.

### API

| Method | Path | Who | Result |
| --- | --- | --- | --- |
| GET | `/invites/{token}` | anyone | the invite's email, or 410-style "no longer valid" problem |
| POST | `/invites/{token}/accept` | anyone | creates the User and logs in (same body and cookie as login) |
| GET | `/admin/invites` | Admin | invites in the list envelope, newest first |
| POST | `/admin/invites` | Admin | the invite, its link and whether the email was sent |
| POST | `/admin/invites/{id}/resend` | Admin | same as sending |
| DELETE | `/admin/invites/{id}` | Admin | 204 |
| POST | `/auth/password-reset` | anyone | always 202 with the same message |
| POST | `/auth/password-reset/confirm` | token | 204 |
| GET | `/admin/users` | Admin | Users in the list envelope |
| PATCH | `/admin/users/{id}` | Admin | Role and/or active; 409 with the Card 4 message for the last Admin |
| GET, PATCH | `/me` | User | my profile; a taken name is a 400 field error on displayName |
| POST | `/auth/password` | User | 204; wrong current password is a field error. Under `/auth` (not `/me/password` as first planned) so the browser sends the refresh cookie, which says which Session to keep |

Status codes chosen while building: an invite or reset link that no longer works is 410 Gone with the card's message;
a taken name, a registered email and a wrong current password are 400 field errors; the last-Admin rule and
deactivating yourself are 409; a Member on an admin endpoint gets 403.

- **Members feature (API):** the Members page actions live in their own small feature, because deactivating needs
  both users (the Role rules, in a transaction) and auth (ending Sessions), and users cannot import auth.

### Migration 00003

- **`invites`:** as in the plan (id, email, Role, token hash, who sent it, expiry, accepted and cancelled times), with
  an index for finding the Pending invite of an email.
- **`password_reset_tokens`:** as in the plan (id, User, token hash, expiry, used time, creation time).
- **Unique display names:** a unique index on the lower-cased display name. This fails if two existing Users already
  share a name; the local database has only the seeded Admin.
- **Nothing is changed in existing columns.** As with every migration, it is written first and Mateus reviews it
  before anything runs, tests included (ADR 0002).

### Web

- **New screens:**

  | Path | Screen |
  | --- | --- |
  | `/invite/:token` | Accept invite |
  | `/forgot-password` | Request reset |
  | `/reset-password?token=` | Set new password |
  | `/profile` | name, Members row for Admins on phones, Log out |
  | `/profile/password` | Change password |
  | `/admin/members` | Members, Admins only |

- **Members page:**
  - Two sections: Users, with Change role, Deactivate and Reactivate; and Invites, with the `StatusPill` plus Resend
    and Cancel.
  - "Invite" opens a dialog: the email, the Role, then the result with a `LinkBox` and, when the send failed, a
    message. Phones get the same dialog for now; a bottom sheet version belongs to step 6 (phone polish).
  - Built from the existing `DataRow`, `MobileListRow`, `StatusPill`, `LinkBox`, `Dialog` and `Sheet`.
- **Navigation:** Members in the desktop app bar for Admins, and a row on Profile on phones.
- **The login page** gets "Forgot password?" and shows "Password updated" after a reset.
- **Layout:** files follow the feature folder layout (`pages/`, `components/`, `api/`, `lib/`): invites, members and
  profile features, and the reset screens in auth.
- **Query keys:** new keys for invites, the User list and "me". Saving a profile also refreshes the Catalog, so new
  Owner names show.

### No feature flag

The step is complete for Cards 1 to 4 when merged, and nothing is deployed (the same decision as step 3).

## Testing Decisions

- **One test per rule, named after it,** for example `TestCard1_Rule4_ResendingInvalidatesThePreviousToken`,
  `TestCard4_Rule6_TheLastAdminCannotBeDemoted` and `it("card 2 rule 7: a reset request always gives the same
  answer")`.
- **A fake email sender** records what would be sent (to, subject, link). It is the only stand-in: email is an outside
  service. The database is never faked.
- **Seam 1, the services against real Postgres (testcontainers):**
  - **Invites:** each Card 1 rule and acceptance criterion; replacing, resending and cancelling; a Deactivated User's
    email; a failed send keeping the invite; double accept; unique names.
  - **Reset:** rules 7 to 9; the newest-only link; the 3-per-hour limit; unknown and Deactivated emails sending
    nothing; clearing the lockout.
  - **Profile:** Card 3 rules 1 to 3 and 5; keeping the current Session on a password change.
  - **Members:**
    - Card 4 rules 5 to 7, and acceptance criteria 3 and 4.
    - Deactivating ending Sessions, reactivating, and self-deactivation refused.
    - The last-Admin race.
- **Seam 2, the HTTP router:**
  - 403 for Members on every admin endpoint.
  - The reset answer is identical for known and unknown emails.
  - Accept sets the refresh cookie like login.
  - The problem+json shapes for the new errors.
- **Seam 3, the web flows with `fetch` stubbed:**
  - Sending an invite, including the "email failed" link box.
  - Accepting an invite, including the expired and logged-in states.
  - Forgot and reset password.
  - Members actions with the last-Admin and self-deactivation errors.
  - Editing the profile and changing the password.
  - A Member never seeing Members.
- **Prior art:** step 1's auth service tests (lockout, session rotation), step 2's policy and router tests, and the
  `dbtest`, `stubFetch`, `renderAppAt` and `sessionFor` helpers.

## Out of Scope

- **A verified sending domain and the deploy.** Resend works for real once Mateus owns and verifies a domain; until
  then the copied invite link is the way in. Deploying stays out, as in earlier steps.
- **Bulk reassigning a Deactivated User's minis:** done one mini at a time.
- **Email change, avatars, Google login:** v1.1.
- **HTML email templates.**
- **Deleting Users:** they are deactivated, never deleted.
- **Feature flags and the `feature_flags` table.**
- **Photos:** step 5.

## Further Notes

- **Seeded Admin:** the seed command stays the only way to make the first Admin (Card 1 rule 7).
- **Initials on owner stamps:** still derived from the display name. Unique names make them easier to tell apart,
  but two names can still share initials.
- **Further gaps:** any card gap found while building stops work for a question.
