# 0006. Brevo over HTTPS for production email

Date: 2026-10-12 · Status: accepted

## Context

Invites (Card 1) and Password resets (Card 2) are emailed. Step 4 sends through Resend's HTTP API, with a local
outbox for development. Two facts came up while planning the first deploy (step 6), which must cost nothing:

- Without a verified domain, Resend only delivers to the address that owns the account. A domain costs money,
  so invites would only work through the copied link, and Password resets for anyone else would never arrive.
- Render's free web services cannot open outbound connections on the SMTP ports (25, 465, 587) since September
  2025 (reported on Render's forum; lifting it needs a paid instance). Gmail SMTP, the plan's alternative, would
  time out once deployed.

## Decision

- Production sends through **Brevo**'s transactional email API over HTTPS, on its free plan, with Mateus's Gmail
  address verified as the single sender. No domain and no SMTP are involved.
- It is a third sender next to Resend and the outbox in `platform/email`, called with plain `net/http`. Settings
  choose it: exactly one of `BREVO_API_KEY`, `RESEND_API_KEY` or `EMAIL_OUTBOX_DIR`.
- Resend stays for a future verified domain; the outbox stays for local development and tests.

## Alternatives

- **Resend plus an Admin "copy a reset link".** Free and certain, but Card 2's self-service reset would need the
  Admin each time.
- **Gmail SMTP.** Free and sends to anyone, but blocked on Render's free plan.
- **The Gmail API over HTTPS.** Free, but needs a Google Cloud project and an OAuth sign-in for one mailbox.
- **A free subdomain** (such as is-a.dev) to verify with Resend. Depends on someone else approving it.

## Consequences

- Emails come from a gmail.com address through another service, so some may land in spam; the group is told to
  look there for the first invite.
- Brevo's free limits (about 300 emails a day when checked) are far above what 10 people need; they are checked
  again in the deploy wizard, because free plans change.
- Moving to a domain later means switching the settings to Resend, with no code change.
