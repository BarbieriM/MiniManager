-- Invites (Card 1). Open means neither accepted nor cancelled: Pending, or Expired once expires_at has passed.

-- LockInviteEmail queues transactions that change the open Invite of the same email until this one ends, so two
-- Sends at once replace one another instead of both inserting. It locks a number derived from the email (an
-- advisory lock), because there may be no row to lock yet.
-- name: LockInviteEmail :exec
SELECT pg_advisory_xact_lock(hashtextextended(lower(@email::text), 0));

-- name: CancelOpenInviteForEmail :exec
UPDATE invites SET cancelled_at = $2, updated_at = $2
WHERE email = $1 AND accepted_at IS NULL AND cancelled_at IS NULL;

-- name: CreateInvite :one
INSERT INTO invites (id, email, role, token_hash, invited_by, expires_at, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
RETURNING *;

-- name: ListInvites :many
SELECT * FROM invites ORDER BY created_at DESC, id DESC;

-- name: GetInvite :one
SELECT * FROM invites WHERE id = $1;

-- name: GetInviteByTokenHash :one
SELECT * FROM invites WHERE token_hash = $1;

-- RenewInvite gives an open Invite a new token and expiry; it returns no row when the Invite is not open.
-- name: RenewInvite :one
UPDATE invites SET token_hash = $2, expires_at = $3, updated_at = $4
WHERE id = $1 AND accepted_at IS NULL AND cancelled_at IS NULL
RETURNING *;

-- name: CancelInvite :execrows
UPDATE invites SET cancelled_at = $2, updated_at = $2
WHERE id = $1 AND accepted_at IS NULL AND cancelled_at IS NULL;

-- AcceptInvite affects no row when the Invite was accepted, cancelled or expired meanwhile.
-- name: AcceptInvite :execrows
UPDATE invites SET accepted_at = $2, updated_at = $2
WHERE id = $1 AND accepted_at IS NULL AND cancelled_at IS NULL AND expires_at > $2;
