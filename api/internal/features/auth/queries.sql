-- NthLatestLoginFailure returns the failed_at of the email's (n+1)th most recent failure; it tells a locked
-- email when enough failures will have left the window.
-- name: NthLatestLoginFailure :one
SELECT failed_at FROM login_failures WHERE email = $1 ORDER BY failed_at DESC OFFSET $2 LIMIT 1;

-- name: CountLoginFailuresSince :one
SELECT count(*) FROM login_failures WHERE email = $1 AND failed_at > $2;

-- name: RecordLoginFailure :exec
INSERT INTO login_failures (id, email, failed_at) VALUES ($1, $2, $3);

-- DeleteLoginFailuresBefore keeps the table small: rows older than the lockout window no longer count.
-- name: DeleteLoginFailuresBefore :exec
DELETE FROM login_failures WHERE email = $1 AND failed_at <= $2;

-- name: ClearLoginFailures :exec
DELETE FROM login_failures WHERE email = $1;

-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, expires_at)
VALUES ($1, $2, $3, $4, $5);

-- name: GetRefreshTokenByHash :one
SELECT * FROM refresh_tokens WHERE token_hash = $1;

-- MarkRefreshTokenRotated affects no row when another request already rotated or revoked the token.
-- name: MarkRefreshTokenRotated :execrows
UPDATE refresh_tokens SET revoked_at = $2, replaced_by = $3, updated_at = $2 WHERE id = $1 AND revoked_at IS NULL;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 WHERE id = $1 AND revoked_at IS NULL;

-- name: RevokeSession :exec
UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 WHERE session_id = $1 AND revoked_at IS NULL;

-- name: RevokeUserSessions :exec
UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 WHERE user_id = $1 AND revoked_at IS NULL;

-- RevokeOtherUserSessions ends every Session of the User except keepSessionID (Card 3 rule 3).
-- name: RevokeOtherUserSessions :exec
UPDATE refresh_tokens SET revoked_at = @revoked_at, updated_at = @revoked_at
WHERE user_id = @user_id AND session_id <> @keep_session_id AND revoked_at IS NULL;

-- name: CreatePasswordResetToken :exec
INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $5);

-- name: CountPasswordResetTokensSince :one
SELECT count(*) FROM password_reset_tokens WHERE user_id = $1 AND created_at > $2;

-- name: GetPasswordResetTokenByHash :one
SELECT * FROM password_reset_tokens WHERE token_hash = $1;

-- Only a User's newest token works (Card 2 edge case: a reset requested twice).
-- name: GetNewestPasswordResetTokenID :one
SELECT id FROM password_reset_tokens WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1;

-- MarkPasswordResetTokenUsed affects no row when another request used the token first.
-- name: MarkPasswordResetTokenUsed :execrows
UPDATE password_reset_tokens SET used_at = $2, updated_at = $2 WHERE id = $1 AND used_at IS NULL;
