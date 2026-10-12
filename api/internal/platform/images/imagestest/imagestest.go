// Package imagestest gives tests an image store that keeps "uploaded" images in memory instead of in Cloudinary.
package imagestest

import (
	"context"
	"errors"
	"slices"
	"strings"
	"sync"

	"github.com/BarbieriM/MiniManager/api/internal/platform/images"
)

// ErrDeleteFailed is what a Store with FailDeletes returns from its deletions.
var ErrDeleteFailed = errors.New("storage is down")

// Store records what the code under test signed and deleted. Upload stands in for the browser's direct upload.
type Store struct {
	mu             sync.Mutex
	stored         map[string]images.Details
	signed         []string
	deleted        []string
	deletedFolders []string
	// FailDeletes makes Delete and DeleteFolder fail, as if Cloudinary were down.
	FailDeletes bool
}

// Upload puts an image named name in the store, as the browser's upload to Cloudinary would.
func (s *Store) Upload(name string, details images.Details) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.stored == nil {
		s.stored = map[string]images.Details{}
	}
	s.stored[name] = details
}

func (s *Store) SignUpload(name string) images.SignedUpload {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.signed = append(s.signed, name)
	return images.SignedUpload{URL: "https://upload.test/image/upload", Fields: map[string]string{"public_id": name, "signature": "signed"}}
}

func (s *Store) Details(_ context.Context, name string) (images.Details, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	details, ok := s.stored[name]
	if !ok {
		return images.Details{}, images.ErrNotFound
	}
	return details, nil
}

func (s *Store) Delete(_ context.Context, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.FailDeletes {
		return ErrDeleteFailed
	}
	s.deleted = append(s.deleted, name)
	delete(s.stored, name)
	return nil
}

func (s *Store) DeleteFolder(_ context.Context, folder string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.FailDeletes {
		return ErrDeleteFailed
	}
	s.deletedFolders = append(s.deletedFolders, folder)
	for name := range s.stored {
		if strings.HasPrefix(name, folder+"/") {
			delete(s.stored, name)
		}
	}
	return nil
}

func (s *Store) ThumbnailURL(name string) string { return "https://images.test/thumbnail/" + name }
func (s *Store) FullURL(name string) string      { return "https://images.test/full/" + name }

// Signed returns the names signed so far.
func (s *Store) Signed() []string { return s.copyOf(s.signed) }

// Deleted returns the image names deleted so far.
func (s *Store) Deleted() []string { return s.copyOf(s.deleted) }

// DeletedFolders returns the folders deleted so far.
func (s *Store) DeletedFolders() []string { return s.copyOf(s.deletedFolders) }

// Has reports whether an image named name is stored.
func (s *Store) Has(name string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.stored[name]
	return ok
}

func (s *Store) copyOf(names []string) []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return slices.Clone(names)
}
