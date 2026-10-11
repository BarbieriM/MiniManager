-- Whole-Catalog counts for the filters' options (Card 6). Each choice's value is read as text, like the URL sends it.

-- name: CountMiniaturesByCreatureType :many
SELECT creature_type::text AS value, count(*) AS count FROM miniatures GROUP BY creature_type;

-- name: CountMiniaturesBySize :many
SELECT size::text AS value, count(*) AS count FROM miniatures GROUP BY size;

-- name: CountMiniaturesByPaintStatus :many
SELECT paint_status::text AS value, count(*) AS count FROM miniatures GROUP BY paint_status;

-- name: CountMiniaturesByOwner :many
SELECT owner_id, count(*) AS count FROM miniatures GROUP BY owner_id;

-- name: CountTagsInUse :many
-- Every tag on at least one Miniature, most used first, then A to Z.
SELECT tag::text AS value, count(*) AS count
FROM miniatures, unnest(tags) AS tag
GROUP BY tag
ORDER BY count(*) DESC, tag;
