-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- CreateUserIfEmailIsFree returns no row when the email already belongs to a User.
-- name: CreateUserIfEmailIsFree :one
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (email) DO NOTHING
RETURNING *;

-- name: ListActiveUsers :many
SELECT * FROM users WHERE active ORDER BY display_name, id;

-- name: GetUsersByIDs :many
SELECT * FROM users WHERE id = ANY(@ids::uuid[]);

-- name: ListUsers :many
-- The Members page: active Users A to Z (ignoring case), then deactivated ones.
SELECT * FROM users ORDER BY active DESC, lower(display_name), id;

-- name: UpdateDisplayName :one
UPDATE users SET display_name = $2, updated_at = now() WHERE id = $1 RETURNING *;

-- name: UpdatePasswordHash :exec
UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1;

-- LockActiveAdmins locks every active Admin's row until the transaction ends, so two role or active changes that
-- could each remove "the other" Admin run one after the other (Card 4 rule 6).
-- name: LockActiveAdmins :many
SELECT id FROM users WHERE role = 'admin' AND active ORDER BY id FOR UPDATE;

-- name: UpdateAccess :one
UPDATE users SET role = $2, active = $3, updated_at = now() WHERE id = $1 RETURNING *;
