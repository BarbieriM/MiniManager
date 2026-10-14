# Spec: Step 6, phone polish, end-to-end tests and the first deploy

Build order step 6 from `docs/plan.md`: finish the phone experience, add the end-to-end tests CLAUDE.md asks for,
and put Mini Manager online for the group, on free plans only. Decisions were made in the planning session of
2026-10-12 (questions Q1 to Q15); ADR 0006 records the email choice.

## Problem Statement

Mini Manager works, but only on Mateus's Mac. Nobody in the group can open it on their phone, so the MVP's
definition of done ("an invited Member logs in on their phone, creates a mini with a photo, and finds it with at
least two filters combined…") has never been tried. A few phone details are still missing, such as the invite form
on a small screen, and nothing tests the main flows in a real browser. Emails cannot reach the group either: Resend
without a paid domain only delivers to Mateus, and Render's free plan blocks SMTP.

## Solution

The app goes live at `https://mini-manager.onrender.com`, with its data on Neon, Photos on Cloudinary and emails
through Brevo, all free. A terminal wizard walks Mateus through the setup without ever showing a secret, ending with
the production database migrated and Mateus as its first Admin. Pushing to `main` then deploys automatically after
CI passes.

Before that, the remaining phone polish lands: the invite form becomes a bottom sheet on phones, and every screen
is checked at 390 px, with the problems Mateus approves fixed. Two end-to-end tests drive a real browser at phone
size through the main flows, locally and in CI. Finally, Mateus runs the definition of done on a real phone.

## User Stories

### Phone polish

1. As an Admin on a phone, I want the invite form and its link in a bottom sheet, so that it fits the screen and
   the keyboard.
2. As an Admin on a desktop, I want the invite form to stay in a dialog.
3. As a User on a phone, I want every screen to fit 390 px with tap targets of at least 44 px, so that nothing is
   cut off or hard to hit (docs/context.md).
4. As Mateus, I want a list of the phone problems found, with screenshots, before anything is changed, so that I
   choose what step 6 fixes.

### End-to-end tests

5. As Mateus, I want a test that accepts an invite, adds a mini and finds it with two filters on a phone-sized
   browser, so that the MVP's main path is checked end to end (CLAUDE.md, Testing).
6. As Mateus, I want a test that a Member cannot edit someone else's mini in the browser.
7. As Mateus, I want to run them with one command, against a throwaway database that never touches my local data.
8. As Mateus, I want CI to run them on every push, so that a broken main flow blocks the deploy.

### Email without a domain or SMTP

9. As an invitee, I want the invite email to reach my inbox, so that I can sign up without the Admin sending the
   link by chat (Card 1).
10. As a User, I want password reset emails to reach me, not only Mateus (Card 2 rule 7).
11. As Mateus developing locally, I want emails to keep going to the outbox, or to Resend if I choose.

### Two environments, one Cloudinary account

12. As Mateus, I want local and production Photos kept in separate folders, so that deleting a test mini can never
    delete a real Photo.

### Deploying

13. As Mateus, I want a wizard that walks me through Neon, Render, Brevo, Cloudinary and GitHub step by step, so
    that I do not have to remember the order or where each value goes.
14. As Mateus, I want the wizard never to print a secret, and to keep production secrets out of files in the repo.
15. As Mateus, I want the wizard to confirm before migrating and seeding the production database, and to run them
    only after I have reviewed the migrations (ADR 0002).
16. As Mateus, I want to be the first production Admin, with a new password.
17. As Mateus, I want pushing to `main` to deploy only after lint, unit tests, end-to-end tests and the image build
    pass.
18. As a User opening the app after a quiet spell, I want the waking-server banner while the free server starts.

### Definition of done

19. As an invited Member on my phone, I want to log in, create a mini with a photo, and find it with two filters
    (MVP definition of done).
20. As the Admin, I want to see and edit that mini, while another Member cannot edit it.

## Implementation Decisions

### Email (platform)

- **Brevo sender:** a third sender beside Resend and the outbox, calling Brevo's transactional email API over HTTPS
  with plain `net/http`, sending the same plain-text Message. Errors name only the status, never the recipient or
  the body, like the Resend sender.
- **Settings:** exactly one of `BREVO_API_KEY`, `RESEND_API_KEY` or `EMAIL_OUTBOX_DIR`; `EMAIL_FROM` is the
  sender, which for Brevo is Mateus's Gmail address verified in Brevo. The server refuses to start with none or more
  than one, naming the three.
- **Why:** Resend delivers only to its owner without a domain, and Render's free plan blocks SMTP (ADR 0006).

### Photos (platform)

- **`CLOUDINARY_FOLDER`:** an optional prefix for every Photo name, `prod` on Render and `dev` locally, so names
  become `prod/minis/{miniatureId}/{photoId}` and deleting a mini's folder stays within its environment. Empty
  keeps today's names, which the tests use.

### Invite sheet (web)

- The invite form and its result (the link to copy, and the "email could not be sent" message) show in a bottom
  `Sheet` below the `md` breakpoint and in the `Dialog` from `md` up. The form and the result are one piece of
  content shared by both containers.
- Which container shows is decided by the viewport width as the page runs, so the two never stack.

### The 390 px audit

- Playwright opens every screen at 390 × 844 with test data and saves a screenshot:
  - Login, Accept invite, Forgot and Reset password.
  - Catalog: empty, with results, filter sheet open, no results.
  - Details: with and without Photos; Add and Edit with the Photos section.
  - Profile, Change password, Members with the invite sheet open.
- Each screenshot is checked against `docs/context.md` (44 px targets, gutters, no horizontal scroll) and the design
  reference. The findings come back to Mateus as a list; only the ones he approves are fixed in this step.

### End-to-end tests (web, Playwright)

- **Flows, at 390 × 844:**
  - **Invite to finding a mini:** the Admin invites by email and copies the link; the invitee opens it, signs up,
    adds a mini, and finds it with two filters combined in the phone filter sheet.
  - **A Member cannot edit someone else's mini:** no Edit or Delete on its details, and the edit URL shows the
    "only the Owner or an admin" note.
- **Environment:** a setup step creates a throwaway database `mini_manager_e2e` on the local Postgres (a temporary
  Postgres in CI), applies the migrations to it, seeds a test Admin, builds and starts the API with emails to a
  temporary outbox and Photos off, and starts the web app. Teardown stops both and drops the database. Mateus's
  `mini_manager` database is never touched (ADR 0002 allows only throwaway databases to be migrated automatically).
- **Command:** `make e2e`. **CI:** a job after lint and unit tests, with the browsers installed; the deploy waits for
  it.

### Deploy

- **Neon:** a free project in AWS `us-east-1`, Postgres 18. Its connection string (with `sslmode=require`) becomes
  `DATABASE_URL`.
- **Render:** a free web service named `mini-manager`, region Virginia, built from the repo's Dockerfile, with
  auto-deploy off. Card verification only, if Render asks for it.
- **Render settings:**

  | Setting | Value |
  | --- | --- |
  | `DATABASE_URL` | Neon's connection string |
  | `JWT_SECRET` | generated by the wizard |
  | `APP_BASE_URL` | `https://mini-manager.onrender.com`, or the name actually given |
  | `EMAIL_FROM` | Mateus's verified Gmail address |
  | `BREVO_API_KEY` | from Brevo |
  | `CLOUDINARY_*` | the existing account, with `CLOUDINARY_FOLDER=prod` |

- **Deploy hook:** Render's deploy hook URL goes into the GitHub secret `RENDER_DEPLOY_HOOK_URL`, which CI's existing
  deploy job calls on `main` after every other job passes.
- **First data:** the wizard runs `make migrate` against Neon, then `make seed` with Mateus's real email, a new
  password and his name, each after a confirmation. The seed values are typed in and never saved. This happens
  right after Neon, before Render: the server refuses to start with pending migrations, so Render's first deploy
  needs a migrated database.
- **No keep-awake ping:** the waking banner covers Render's sleep; a ping can be added later.

### The deploy wizard

- A bash script from the wizard template, kept in the repo, one stage per service in the order above, opening each
  site, saying exactly what to click, and capturing values with hidden entry for secrets.
- Secrets go only to Render's settings (typed by Mateus in Render's dashboard, as the wizard instructs) and to
  GitHub secrets (through the `gh` CLI). Nothing secret is written to the repo or printed.
- Where the wizard cannot know a service's current screens, it says so instead of guessing.

### Docs

- ADR 0006 (Brevo); the plan's email row and step 6 scope; CLAUDE.md's stack, build order and `make e2e`;
  `.env.example` gains `BREVO_API_KEY` and `CLOUDINARY_FOLDER`.

## Testing Decisions

- **Good tests check behaviour through public seams,** as in steps 2 to 5.
- **The Brevo client:** against a fake HTTP server, like the Resend client: the request it sends (sender,
  recipient, subject, text, the API key header) and an error that names only the status.
- **Config:** the three-way email choice (one required, two refused) and the optional Cloudinary folder.
- **The Cloudinary folder:** a Photo's name and its folder deletion carry the prefix (photos service tests with the
  fake image store).
- **The invite sheet:** a web test at phone width shows the form in a Sheet, and at desktop width in a Dialog.
- **The end-to-end flows** are the new seam: a real browser, the real API and a real throwaway database, nothing
  stubbed except email (outbox) and Photos (off).
- **The wizard:** checked with `bash -n` and shellcheck and traced by hand against CI's secret names; not run end to
  end by Claude, because it opens browsers and waits for Mateus.
- **The phone test:** the MVP's definition of done, done by Mateus on a real phone on the live site, with a second
  account for "another Member cannot edit it".
- **Prior art:** the Resend and outbox tests, the config tests, the photos service tests, the members page tests,
  and the existing CI workflow.

## Out of Scope

- **Any paid service:** a domain, a paid Render instance, paid Neon or Cloudinary.
- **A keep-awake ping** (UptimeRobot); later, if game nights feel slow.
- **Photos in the end-to-end tests:** they stay covered by the unit and web tests; the real upload is checked by
  hand on the phone.
- **Fixes from the audit that Mateus does not approve.**
- **Backups and monitoring** beyond what Neon and Render give for free.

## Further Notes

- **Free-plan facts are approximate** and were checked on 2026-10-12: Neon free needs no card; Render free usually
  needs none but may ask for card verification; Render free blocks SMTP; Brevo's free plan sends about 300 emails a
  day. The wizard rechecks them at each sign-up step.
- **Before merging this step's PR,** nothing is deployed. After it merges, the wizard sets up production; the first
  push to `main` after that deploys.
- **Migrations on production** follow ADR 0002: Mateus runs `make migrate` against Neon before merging any PR that
  contains a migration.
