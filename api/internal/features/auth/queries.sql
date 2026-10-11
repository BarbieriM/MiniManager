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
