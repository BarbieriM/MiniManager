-- Photos (Card 7). Positions are 0 to 2 in the order Photos were added, with no gaps.

-- LockMiniaturePhotos queues transactions that change one Miniature's Photos until this one ends, so the limit of 3
-- and the single cover hold when two requests arrive together. It locks a number derived from the Miniature id (an
-- advisory lock), because the Miniature's row belongs to the miniatures feature.
-- name: LockMiniaturePhotos :exec
SELECT pg_advisory_xact_lock(hashtextextended(@miniature_id::text, 7));

-- name: ListPhotos :many
SELECT * FROM photos WHERE miniature_id = $1 ORDER BY position;

-- name: CountPhotos :one
SELECT count(*) FROM photos WHERE miniature_id = $1;

-- name: CreatePhoto :one
INSERT INTO photos (id, miniature_id, storage_name, width, height, bytes, position, is_cover)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ClearCover :exec
UPDATE photos SET is_cover = false, updated_at = now() WHERE miniature_id = $1 AND is_cover;

-- name: SetCover :execrows
UPDATE photos SET is_cover = true, updated_at = now() WHERE id = $1 AND miniature_id = $2;

-- name: DeletePhoto :one
DELETE FROM photos WHERE id = $1 AND miniature_id = $2 RETURNING *;

-- MoveDownAfter closes the gap a removed Photo left (the position rule is checked at the end of the statement).
-- name: MoveDownAfter :exec
UPDATE photos SET position = position - 1, updated_at = now() WHERE miniature_id = $1 AND position > $2;

-- name: MakeFirstTheCover :exec
UPDATE photos SET is_cover = true, updated_at = now() WHERE miniature_id = $1 AND position = 0;

-- name: CoverStorageNames :many
SELECT miniature_id, storage_name FROM photos WHERE is_cover AND miniature_id = ANY(@miniature_ids::uuid[]);
