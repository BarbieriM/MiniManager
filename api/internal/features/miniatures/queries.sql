-- name: CreateMiniature :one
INSERT INTO miniatures (
    id, owner_id, created_by, name, name_search, creature_type, size, challenge_rating, quantity,
    paint_status, tags, storage_location, manufacturer, notes, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15
)
RETURNING *;

-- name: GetMiniature :one
SELECT * FROM miniatures WHERE id = $1;

-- UpdateMiniature applies only when the stored version still matches (Card 5 rule 7); no row means a conflict
-- or a deleted Miniature.
-- name: UpdateMiniature :one
UPDATE miniatures SET
    owner_id = $3, name = $4, name_search = $5, creature_type = $6, size = $7, challenge_rating = $8,
    quantity = $9, paint_status = $10, tags = $11, storage_location = $12, manufacturer = $13, notes = $14,
    updated_at = $15, version = version + 1
WHERE id = $1 AND version = $2
RETURNING *;

-- name: DeleteMiniature :execrows
DELETE FROM miniatures WHERE id = $1;

-- name: CountMiniatures :one
SELECT count(*) FROM miniatures;

-- The list queries differ only in their ORDER BY; ties end on id so paging is stable (Card 5 rule 10).
-- Step 3's filters replace them with one built query.

-- name: ListMiniaturesByName :many
SELECT * FROM miniatures ORDER BY name_search, id LIMIT $1 OFFSET $2;

-- name: ListMiniaturesNewestFirst :many
SELECT * FROM miniatures ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2;

-- name: ListMiniaturesByChallengeRating :many
SELECT * FROM miniatures ORDER BY challenge_rating NULLS LAST, name_search, id LIMIT $1 OFFSET $2;

-- name: ListMiniaturesBySize :many
SELECT * FROM miniatures ORDER BY size, name_search, id LIMIT $1 OFFSET $2;
