# Card 2. Log in, log out, password reset

Approved card, copied from `docs/features.md` when build step 1 started. Step 1 implements rules 1 to 6 and 10;
rules 7 to 9 (password reset) come with email in step 4. Decisions on the gaps are in ADR 0002.

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
