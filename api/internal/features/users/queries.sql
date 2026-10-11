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
