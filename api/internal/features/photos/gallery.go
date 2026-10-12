// Package photos implements Photos of a Miniature (Card 7). The files live in Cloudinary (ADR 0005); this package
// keeps their rows and decides who may add, change or remove them.
package photos

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/miniatures"
	"github.com/BarbieriM/MiniManager/api/internal/platform/images"
)

// ImageStore keeps Photo files; images.Cloudinary is the real one and imagestest.Store the tests' one.
type ImageStore interface {
	SignUpload(name string) images.SignedUpload
	Details(ctx context.Context, name string) (images.Details, error)
	Delete(ctx context.Context, name string) error
	DeleteFolder(ctx context.Context, folder string) error
	ThumbnailURL(name string) string
	FullURL(name string) string
}

// Gallery reads Photos and deletes their files, without the rules on who may change them. The miniatures feature
// uses it to show Photos and to delete a Miniature's files, and Service builds its rules on it.
type Gallery struct {
	pool    *pgxpool.Pool
	queries *Queries
	// images is nil when no Cloudinary account is configured: Photos are off.
	images ImageStore
}

// NewGallery returns a Gallery over pool. A nil imageStore turns Photos off (step 5 planning, Q8).
func NewGallery(pool *pgxpool.Pool, imageStore ImageStore) *Gallery {
	return &Gallery{pool: pool, queries: New(pool), images: imageStore}
}

// Enabled reports whether Photos are set up.
func (g *Gallery) Enabled() bool {
	return g.images != nil
}

// PhotosOf returns a Miniature's Photos in the order they were added. With Photos off it returns none.
func (g *Gallery) PhotosOf(ctx context.Context, miniatureID uuid.UUID) ([]miniatures.Photo, error) {
	if !g.Enabled() {
		return nil, nil
	}
	rows, err := g.queries.ListPhotos(ctx, miniatureID)
	if err != nil {
		return nil, fmt.Errorf("list photos: %w", err)
	}
	return g.toPhotos(rows), nil
}

// CoverThumbnails returns the cover thumbnail link of each Miniature with a cover, in one query.
func (g *Gallery) CoverThumbnails(ctx context.Context, miniatureIDs []uuid.UUID) (map[uuid.UUID]string, error) {
	covers := map[uuid.UUID]string{}
	if !g.Enabled() || len(miniatureIDs) == 0 {
		return covers, nil
	}
	rows, err := g.queries.CoverStorageNames(ctx, miniatureIDs)
	if err != nil {
		return nil, fmt.Errorf("find covers: %w", err)
	}
	for _, row := range rows {
		covers[row.MiniatureID] = g.images.ThumbnailURL(row.StorageName)
	}
	return covers, nil
}

// DeleteFilesOf deletes the stored files of every Photo of a Miniature, including uploads never registered.
func (g *Gallery) DeleteFilesOf(ctx context.Context, miniatureID uuid.UUID) error {
	if !g.Enabled() {
		return nil
	}
	return g.images.DeleteFolder(ctx, folderOf(miniatureID))
}

func (g *Gallery) toPhotos(rows []photoRow) []miniatures.Photo {
	photos := make([]miniatures.Photo, len(rows))
	for i, row := range rows {
		photos[i] = g.toPhoto(row)
	}
	return photos
}

func (g *Gallery) toPhoto(row photoRow) miniatures.Photo {
	return miniatures.Photo{
		ID: row.ID, ThumbnailURL: g.images.ThumbnailURL(row.StorageName), FullURL: g.images.FullURL(row.StorageName), IsCover: row.IsCover,
	}
}

// folderOf is where a Miniature's Photo files live; storageName is one Photo's file (ADR 0005).
func folderOf(miniatureID uuid.UUID) string {
	return "minis/" + miniatureID.String()
}

func storageName(miniatureID, photoID uuid.UUID) string {
	return folderOf(miniatureID) + "/" + photoID.String()
}
