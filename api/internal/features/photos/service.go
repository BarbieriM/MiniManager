package photos

import (
	"context"
	"errors"
	"fmt"
	"log"
	"slices"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/BarbieriM/MiniManager/api/internal/features/miniatures"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/images"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Card 7 limits (rules 1 and 2). web/src/shared/lib/getPhotoError.ts checks the same ones in the browser first.
const (
	maxPhotos     = 3
	maxPhotoBytes = 5 << 20
)

// acceptedFormats are the formats Cloudinary reports for JPEG, PNG and WebP images (Card 7 rule 2). It reads them
// from the image itself, not from the file name.
var acceptedFormats = []string{"jpg", "jpeg", "png", "webp"}

// Messages from Card 7, plus one for an upload that never reached storage.
const (
	tooManyMessage    = "A miniature can have up to 3 photos."
	wrongTypeMessage  = "Use a JPEG, PNG or WebP image."
	tooBigMessage     = "Images must be 5 MB or smaller."
	notArrivedMessage = "The upload did not finish. Try again."
)

var (
	// ErrNotSetUp means no Cloudinary account is configured, so Photos are off.
	ErrNotSetUp = errors.New("photos are not set up")
	// ErrNotFound means the Miniature has no Photo with that id.
	ErrNotFound = errors.New("photo not found")
	// ErrAlreadyAdded means the upload was registered before, for example by a repeated request.
	ErrAlreadyAdded = errors.New("photo already added")
)

// miniatureFinder finds a Miniature and whether the User may change it; miniatures.Service is the real one.
type miniatureFinder interface {
	Get(ctx context.Context, actor users.User, id uuid.UUID) (miniatures.Miniature, error)
}

// Service holds the Card 7 rules.
type Service struct {
	gallery    *Gallery
	miniatures miniatureFinder
}

// NewService returns a Service.
func NewService(gallery *Gallery, miniatureFinder miniatureFinder) *Service {
	return &Service{gallery: gallery, miniatures: miniatureFinder}
}

// Upload is a signed upload for one new Photo: its id, its file name in storage, and what the browser sends to
// Cloudinary.
type Upload struct {
	PhotoID uuid.UUID
	Name    string
	images.SignedUpload
}

// Sign lets the browser upload one Photo straight to storage (ADR 0005). The Service chooses the Photo's id and
// file name, so only a file in this Miniature's folder can be registered for it. A Miniature that already has 3
// Photos is refused here for quick feedback; Register checks again.
func (s *Service) Sign(ctx context.Context, actor users.User, miniatureID uuid.UUID) (Upload, error) {
	if err := s.checkCanChange(ctx, actor, miniatureID); err != nil {
		return Upload{}, err
	}
	count, err := s.gallery.queries.CountPhotos(ctx, miniatureID)
	if err != nil {
		return Upload{}, fmt.Errorf("count photos: %w", err)
	}
	if count >= maxPhotos {
		return Upload{}, problem(tooManyMessage)
	}
	photoID, err := uuid.NewV7()
	if err != nil {
		return Upload{}, fmt.Errorf("new photo id: %w", err)
	}
	name := storageName(miniatureID, photoID)
	return Upload{PhotoID: photoID, Name: name, SignedUpload: s.gallery.images.SignUpload(name)}, nil
}

// Register saves an uploaded Photo (Card 7 rules 1 to 3). It reads the stored file's real format and size from
// storage; a file that breaks Card 7 is deleted and refused. Counting and saving run under the Miniature's photo
// lock, so two uploads at once cannot pass the limit. The first Photo becomes the cover.
func (s *Service) Register(ctx context.Context, actor users.User, miniatureID, photoID uuid.UUID) (miniatures.Photo, error) {
	if err := s.checkCanChange(ctx, actor, miniatureID); err != nil {
		return miniatures.Photo{}, err
	}
	name := storageName(miniatureID, photoID)
	details, err := s.gallery.images.Details(ctx, name)
	if errors.Is(err, images.ErrNotFound) {
		return miniatures.Photo{}, problem(notArrivedMessage)
	}
	if err != nil {
		return miniatures.Photo{}, fmt.Errorf("read uploaded image: %w", err)
	}
	if message := detailsProblem(details); message != "" {
		s.deleteFile(ctx, name)
		return miniatures.Photo{}, problem(message)
	}

	var created photoRow
	err = s.inPhotoLock(ctx, miniatureID, func(queries *Queries) error {
		count, err := queries.CountPhotos(ctx, miniatureID)
		if err != nil {
			return fmt.Errorf("count photos: %w", err)
		}
		if count >= maxPhotos {
			return problem(tooManyMessage)
		}
		created, err = queries.CreatePhoto(ctx, CreatePhotoParams{
			ID: photoID, MiniatureID: miniatureID, StorageName: name,
			Width: int32(details.Width), Height: int32(details.Height), Bytes: int32(details.Bytes),
			Position: int16(count), IsCover: count == 0,
		})
		if isUniqueViolation(err) {
			return ErrAlreadyAdded
		}
		if err != nil {
			return fmt.Errorf("create photo: %w", err)
		}
		return nil
	})
	// A refused upload's file is deleted; an already added one is the Photo itself, so it stays.
	var problems validation.Errors
	if errors.As(err, &problems) {
		s.deleteFile(ctx, name)
	}
	if err != nil {
		return miniatures.Photo{}, err
	}
	return s.gallery.toPhoto(created), nil
}

// MakeCover makes photoID the Miniature's cover (Card 7 rule 3) and returns its Photos.
func (s *Service) MakeCover(ctx context.Context, actor users.User, miniatureID, photoID uuid.UUID) ([]miniatures.Photo, error) {
	if err := s.checkCanChange(ctx, actor, miniatureID); err != nil {
		return nil, err
	}
	err := s.inPhotoLock(ctx, miniatureID, func(queries *Queries) error {
		// One cover per Miniature: the old cover stops being one before the new one starts.
		if err := queries.ClearCover(ctx, miniatureID); err != nil {
			return fmt.Errorf("clear cover: %w", err)
		}
		changed, err := queries.SetCover(ctx, SetCoverParams{ID: photoID, MiniatureID: miniatureID})
		if err != nil {
			return fmt.Errorf("set cover: %w", err)
		}
		if changed == 0 {
			return ErrNotFound
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.gallery.PhotosOf(ctx, miniatureID)
}

// Remove deletes a Photo (Card 7 rule 6). The Photos after it move down a place, and when it was the cover the
// next Photo becomes the cover (Card 7 edge case). Its file is deleted after; a failure is logged and the removal
// stands (step 5 planning, Q6).
func (s *Service) Remove(ctx context.Context, actor users.User, miniatureID, photoID uuid.UUID) error {
	if err := s.checkCanChange(ctx, actor, miniatureID); err != nil {
		return err
	}
	var removed photoRow
	err := s.inPhotoLock(ctx, miniatureID, func(queries *Queries) error {
		var err error
		removed, err = queries.DeletePhoto(ctx, DeletePhotoParams{ID: photoID, MiniatureID: miniatureID})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("delete photo: %w", err)
		}
		if err := queries.MoveDownAfter(ctx, MoveDownAfterParams{MiniatureID: miniatureID, Position: removed.Position}); err != nil {
			return fmt.Errorf("move photos down: %w", err)
		}
		if removed.IsCover {
			if err := queries.MakeFirstTheCover(ctx, miniatureID); err != nil {
				return fmt.Errorf("choose new cover: %w", err)
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	s.deleteFile(ctx, removed.StorageName)
	return nil
}

// inPhotoLock runs work in a transaction holding the Miniature's photo lock, so changes to one Miniature's Photos
// happen one after the other: the limit of 3 and the single cover hold when requests arrive together.
func (s *Service) inPhotoLock(ctx context.Context, miniatureID uuid.UUID, work func(queries *Queries) error) error {
	return pgx.BeginFunc(ctx, s.gallery.pool, func(tx pgx.Tx) error {
		queries := s.gallery.queries.WithTx(tx)
		if err := queries.LockMiniaturePhotos(ctx, miniatureID.String()); err != nil {
			return fmt.Errorf("lock photos: %w", err)
		}
		return work(queries)
	})
}

// isUniqueViolation reports whether err is Postgres refusing a second row with the same id or storage name.
func isUniqueViolation(err error) bool {
	var postgresErr *pgconn.PgError
	return errors.As(err, &postgresErr) && postgresErr.Code == "23505"
}

// checkCanChange finds the Miniature and checks the actor may change it, which is who may change its Photos
// (Card 7 rule 5, decided by policy.go through the miniatures feature).
func (s *Service) checkCanChange(ctx context.Context, actor users.User, miniatureID uuid.UUID) error {
	if !s.gallery.Enabled() {
		return ErrNotSetUp
	}
	miniature, err := s.miniatures.Get(ctx, actor, miniatureID)
	if err != nil {
		return err
	}
	if !miniature.CanChange {
		return miniatures.ErrForbidden
	}
	return nil
}

// deleteFile deletes a stored file, logging a failure: a leftover file is invisible and goes with the Miniature's
// folder later.
func (s *Service) deleteFile(ctx context.Context, name string) {
	if err := s.gallery.images.Delete(ctx, name); err != nil {
		log.Printf("delete photo file: %v", err)
	}
}

// detailsProblem returns the Card 7 message for a stored file that breaks rule 2, or "".
func detailsProblem(details images.Details) string {
	switch {
	case !slices.Contains(acceptedFormats, details.Format):
		return wrongTypeMessage
	case details.Bytes > maxPhotoBytes:
		return tooBigMessage
	}
	return ""
}

func problem(message string) validation.Errors {
	return validation.Errors{{Field: "photo", Message: message}}
}
