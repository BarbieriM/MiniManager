package miniatures

import (
	"context"

	"github.com/google/uuid"
)

// Photo is one Photo of a Miniature as the Catalog shows it (Card 7): links to its two sizes, and whether it is
// the cover.
type Photo struct {
	ID           uuid.UUID
	ThumbnailURL string
	FullURL      string
	IsCover      bool
}

// photoGallery reads a Miniature's Photos and deletes their files; photos.Gallery is the real one. The photos
// feature owns them, so the Catalog asks it instead of reading its table.
type photoGallery interface {
	// Enabled reports whether Photos are set up (a Cloudinary account is configured).
	Enabled() bool
	// PhotosOf returns a Miniature's Photos in the order they were added.
	PhotosOf(ctx context.Context, miniatureID uuid.UUID) ([]Photo, error)
	// CoverThumbnails returns the cover thumbnail link of each Miniature that has a cover, keyed by Miniature id.
	CoverThumbnails(ctx context.Context, miniatureIDs []uuid.UUID) (map[uuid.UUID]string, error)
	// DeleteFilesOf deletes every stored file of a Miniature's Photos (Card 7 rule 6).
	DeleteFilesOf(ctx context.Context, miniatureID uuid.UUID) error
}

// PhotosEnabled reports whether Photos are set up, so the UI can show or hide them.
func (s *Service) PhotosEnabled() bool {
	return s.gallery.Enabled()
}

// withPhotos adds the Miniature's Photos, for the details page and after a save.
func (s *Service) withPhotos(ctx context.Context, miniature Miniature) (Miniature, error) {
	photos, err := s.gallery.PhotosOf(ctx, miniature.ID)
	if err != nil {
		return Miniature{}, err
	}
	miniature.Photos = photos
	return miniature, nil
}

// withCovers adds each Miniature's cover thumbnail, for the Catalog list (Card 7 output), in one query per page.
func (s *Service) withCovers(ctx context.Context, items []Miniature) ([]Miniature, error) {
	ids := make([]uuid.UUID, len(items))
	for i, item := range items {
		ids[i] = item.ID
	}
	covers, err := s.gallery.CoverThumbnails(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range items {
		items[i].CoverThumbnailURL = covers[items[i].ID]
	}
	return items, nil
}
