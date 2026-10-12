package photos_test

import (
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/filters"
	"github.com/BarbieriM/MiniManager/api/internal/features/miniatures"
	"github.com/BarbieriM/MiniManager/api/internal/features/photos"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
	"github.com/BarbieriM/MiniManager/api/internal/platform/images"
	"github.com/BarbieriM/MiniManager/api/internal/platform/images/imagestest"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// A 3 MB JPEG from a phone, as Cloudinary measures it after the upload (Card 7 acceptance criterion 1).
var phonePhoto = images.Details{Format: "jpg", Bytes: 3 << 20, Width: 1200, Height: 1600}

type fixture struct {
	pool       *pgxpool.Pool
	store      *imagestest.Store
	miniatures *miniatures.Service
	photos     *photos.Service
	admin      users.User
	ana        users.User
}

func newFixture(t *testing.T) fixture {
	t.Helper()
	pool := dbtest.NewDatabase(t)
	userService := users.NewService(pool)
	if _, err := userService.CreateAdmin(t.Context(), users.NewAdmin{Email: "mateus@example.com", Password: "correct horse", DisplayName: "Mateus"}); err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	admin, err := userService.FindByEmail(t.Context(), "mateus@example.com")
	if err != nil {
		t.Fatalf("FindByEmail: %v", err)
	}
	ana, err := userService.Create(t.Context(), users.NewUser{Email: "ana@example.com", Password: "correct horse", DisplayName: "Ana", Role: users.RoleMember})
	if err != nil {
		t.Fatalf("Create Ana: %v", err)
	}
	store := &imagestest.Store{}
	gallery := photos.NewGallery(pool, store)
	miniatureService := miniatures.NewService(pool, userService, filters.NewService(pool, userService), gallery, time.Now)
	return fixture{
		pool: pool, store: store, miniatures: miniatureService, photos: photos.NewService(gallery, miniatureService),
		admin: admin, ana: ana,
	}
}

// goblin adds a Miniature owned by owner.
func (f fixture) goblin(t *testing.T, owner users.User) miniatures.Miniature {
	t.Helper()
	created, err := f.miniatures.Create(t.Context(), owner, miniatures.Input{Name: "Goblin", CreatureType: "humanoid", Size: "small"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	return created
}

// upload signs an upload as actor, stores details under the signed name as the browser would, and registers it.
func (f fixture) upload(t *testing.T, actor users.User, miniatureID uuid.UUID, details images.Details) (miniatures.Photo, error) {
	t.Helper()
	signed, err := f.photos.Sign(t.Context(), actor, miniatureID)
	if err != nil {
		return miniatures.Photo{}, err
	}
	f.store.Upload(signed.Name, details)
	return f.photos.Register(t.Context(), actor, miniatureID, signed.PhotoID)
}

func (f fixture) mustUpload(t *testing.T, actor users.User, miniatureID uuid.UUID) miniatures.Photo {
	t.Helper()
	photo, err := f.upload(t, actor, miniatureID, phonePhoto)
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	return photo
}

func (f fixture) photosOf(t *testing.T, miniatureID uuid.UUID) []miniatures.Photo {
	t.Helper()
	miniature, err := f.miniatures.Get(t.Context(), f.admin, miniatureID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	return miniature.Photos
}

func assertProblem(t *testing.T, err error, message string) {
	t.Helper()
	var problems validation.Errors
	if !errors.As(err, &problems) || len(problems) != 1 || problems[0].Field != "photo" || problems[0].Message != message {
		t.Fatalf("error = %v, want photo: %q", err, message)
	}
}

func TestCard7_Rule3_AcceptanceCriterion1_TheFirstPhotoBecomesTheCover(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)

	photo := f.mustUpload(t, f.ana, goblin.ID)

	if !photo.IsCover || photo.ThumbnailURL == "" || photo.FullURL == "" {
		t.Fatalf("photo = %+v, want the cover with both links", photo)
	}
	page, err := f.miniatures.List(t.Context(), f.ana, miniatures.ListOptions{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if page.Items[0].CoverThumbnailURL != photo.ThumbnailURL {
		t.Errorf("list cover = %q, want %q", page.Items[0].CoverThumbnailURL, photo.ThumbnailURL)
	}
}

func TestCard7_Rule1_AcceptanceCriterion2_AFourthPhotoIsRefused(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	for range 3 {
		f.mustUpload(t, f.ana, goblin.ID)
	}

	_, err := f.photos.Sign(t.Context(), f.ana, goblin.ID)

	assertProblem(t, err, "A miniature can have up to 3 photos.")
}

func TestCard7_Rule1_TwoRegistrationsAtOnceCannotPassTheLimit(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	f.mustUpload(t, f.ana, goblin.ID)
	f.mustUpload(t, f.ana, goblin.ID)
	// Both signed while the mini had 2 Photos, then registered at the same moment.
	var photoIDs []uuid.UUID
	for range 2 {
		signed, err := f.photos.Sign(t.Context(), f.ana, goblin.ID)
		if err != nil {
			t.Fatalf("Sign: %v", err)
		}
		f.store.Upload(signed.Name, phonePhoto)
		photoIDs = append(photoIDs, signed.PhotoID)
	}

	var wait sync.WaitGroup
	errs := make([]error, 2)
	for i, photoID := range photoIDs {
		wait.Go(func() { _, errs[i] = f.photos.Register(t.Context(), f.ana, goblin.ID, photoID) })
	}
	wait.Wait()

	if len(f.photosOf(t, goblin.ID)) != 3 || (errs[0] == nil) == (errs[1] == nil) {
		t.Fatalf("photos = %d, errors %v; want 3 photos and exactly one refusal", len(f.photosOf(t, goblin.ID)), errs)
	}
	refused := photoIDs[0]
	if errs[0] == nil {
		refused = photoIDs[1]
	}
	if f.store.Has("minis/" + goblin.ID.String() + "/" + refused.String()) {
		t.Error("the refused upload's file is still stored")
	}
}

func TestCard7_Rule2_AFileThatIsNotJPEGPNGOrWebPIsDeletedAndRefused(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)

	_, err := f.upload(t, f.ana, goblin.ID, images.Details{Format: "gif", Bytes: 1000, Width: 10, Height: 10})

	assertProblem(t, err, "Use a JPEG, PNG or WebP image.")
	if len(f.store.Deleted()) != 1 || len(f.photosOf(t, goblin.ID)) != 0 {
		t.Errorf("deleted %v, photos %d; want the file deleted and no Photo", f.store.Deleted(), len(f.photosOf(t, goblin.ID)))
	}
}

func TestCard7_Rule2_AcceptanceCriterion3_A10MBFileIsDeletedAndRefused(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)

	_, err := f.upload(t, f.ana, goblin.ID, images.Details{Format: "jpg", Bytes: 10 << 20, Width: 4000, Height: 3000})

	assertProblem(t, err, "Images must be 5 MB or smaller.")
	if len(f.store.Deleted()) != 1 || len(f.photosOf(t, goblin.ID)) != 0 {
		t.Errorf("deleted %v, photos %d; want the file deleted and no Photo", f.store.Deleted(), len(f.photosOf(t, goblin.ID)))
	}
}

func TestCard7_PNGAndWebPAreAccepted(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)

	for _, format := range []string{"png", "webp"} {
		if _, err := f.upload(t, f.ana, goblin.ID, images.Details{Format: format, Bytes: 1000, Width: 10, Height: 10}); err != nil {
			t.Errorf("%s: %v", format, err)
		}
	}
}

func TestCard7_AnUploadThatNeverArrivedIsNotSaved(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	signed, err := f.photos.Sign(t.Context(), f.ana, goblin.ID)
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	_, err = f.photos.Register(t.Context(), f.ana, goblin.ID, signed.PhotoID)

	assertProblem(t, err, "The upload did not finish. Try again.")
}

func TestCard7_OnlyAFileInTheMiniaturesOwnFolderCanBeRegistered(t *testing.T) {
	f := newFixture(t)
	anasGoblin := f.goblin(t, f.ana)
	mateusGoblin := f.goblin(t, f.admin)
	// A Photo uploaded to Mateus's mini cannot be registered on Ana's by sending its id.
	signed, err := f.photos.Sign(t.Context(), f.admin, mateusGoblin.ID)
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}
	f.store.Upload(signed.Name, phonePhoto)

	_, err = f.photos.Register(t.Context(), f.ana, anasGoblin.ID, signed.PhotoID)

	assertProblem(t, err, "The upload did not finish. Try again.")
}

func TestCard7_Rule5_OnlySomeoneWhoCanChangeTheMiniManagesItsPhotos(t *testing.T) {
	f := newFixture(t)
	mateusGoblin := f.goblin(t, f.admin)
	photo := f.mustUpload(t, f.admin, mateusGoblin.ID)

	_, signErr := f.photos.Sign(t.Context(), f.ana, mateusGoblin.ID)
	_, coverErr := f.photos.MakeCover(t.Context(), f.ana, mateusGoblin.ID, photo.ID)
	removeErr := f.photos.Remove(t.Context(), f.ana, mateusGoblin.ID, photo.ID)

	for _, err := range []error{signErr, coverErr, removeErr} {
		if !errors.Is(err, miniatures.ErrForbidden) {
			t.Errorf("error = %v, want ErrForbidden", err)
		}
	}
}

func TestCard7_Rule5_AnAdminManagesThePhotosOfAnyMini(t *testing.T) {
	f := newFixture(t)
	anasGoblin := f.goblin(t, f.ana)

	if _, err := f.upload(t, f.admin, anasGoblin.ID, phonePhoto); err != nil {
		t.Fatalf("Admin upload: %v", err)
	}
}

func TestCard7_Rule3_AnotherPhotoCanBecomeTheCover(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	f.mustUpload(t, f.ana, goblin.ID)
	second := f.mustUpload(t, f.ana, goblin.ID)

	listed, err := f.photos.MakeCover(t.Context(), f.ana, goblin.ID, second.ID)

	if err != nil {
		t.Fatalf("MakeCover: %v", err)
	}
	if listed[0].IsCover || !listed[1].IsCover || listed[1].ID != second.ID {
		t.Errorf("photos = %+v, want only the second as cover, order unchanged", listed)
	}
}

func TestCard7_Rule6_RemovingThePhotoDeletesItsFileAndTheNextBecomesTheCover(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	cover := f.mustUpload(t, f.ana, goblin.ID)
	second := f.mustUpload(t, f.ana, goblin.ID)
	third := f.mustUpload(t, f.ana, goblin.ID)

	if err := f.photos.Remove(t.Context(), f.ana, goblin.ID, cover.ID); err != nil {
		t.Fatalf("Remove: %v", err)
	}

	left := f.photosOf(t, goblin.ID)
	if len(left) != 2 || left[0].ID != second.ID || !left[0].IsCover || left[1].ID != third.ID {
		t.Fatalf("photos = %+v, want second (cover) then third", left)
	}
	if len(f.store.Deleted()) != 1 {
		t.Errorf("deleted %v, want the cover's file", f.store.Deleted())
	}
	// The freed place takes a new Photo again (positions stay 0, 1, 2).
	f.mustUpload(t, f.ana, goblin.ID)
}

func TestCard7_RemovingStillSucceedsWhenTheFileCannotBeDeleted(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	photo := f.mustUpload(t, f.ana, goblin.ID)
	f.store.FailDeletes = true

	if err := f.photos.Remove(t.Context(), f.ana, goblin.ID, photo.ID); err != nil {
		t.Fatalf("Remove: %v", err)
	}
	if len(f.photosOf(t, goblin.ID)) != 0 {
		t.Error("the Photo is still listed")
	}
}

func TestCard7_Rule6_AcceptanceCriterion4_DeletingAMiniDeletesItsFiles(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	photo := f.mustUpload(t, f.ana, goblin.ID)

	if err := f.miniatures.Delete(t.Context(), f.ana, goblin.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	if folders := f.store.DeletedFolders(); len(folders) != 1 || folders[0] != "minis/"+goblin.ID.String() {
		t.Errorf("deleted folders = %v, want the mini's", folders)
	}
	if f.store.Has("minis/" + goblin.ID.String() + "/" + photo.ID.String()) {
		t.Error("the Photo's file is still stored")
	}
}

func TestCard7_DeletingAMiniStillSucceedsWhenItsFilesCannotBeDeleted(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	f.mustUpload(t, f.ana, goblin.ID)
	f.store.FailDeletes = true

	if err := f.miniatures.Delete(t.Context(), f.ana, goblin.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := f.miniatures.Get(t.Context(), f.ana, goblin.ID); !errors.Is(err, miniatures.ErrNotFound) {
		t.Errorf("Get after delete: %v, want ErrNotFound", err)
	}
}

func TestCard7_PhotosDoNotChangeTheMinisVersion(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)

	f.mustUpload(t, f.ana, goblin.ID)

	after, err := f.miniatures.Get(t.Context(), f.ana, goblin.ID)
	if err != nil || after.Version != goblin.Version {
		t.Fatalf("version %d → %d (%v), want unchanged", goblin.Version, after.Version, err)
	}
}

func TestCard7_WithoutCloudinaryPhotosAreOff(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	off := photos.NewService(photos.NewGallery(f.pool, nil), f.miniatures)

	_, err := off.Sign(t.Context(), f.ana, goblin.ID)

	if !errors.Is(err, photos.ErrNotSetUp) {
		t.Fatalf("Sign: error = %v, want ErrNotSetUp", err)
	}
}

func TestCard7_Rule4_APhotoIsShownAtAThumbnailAndAFullSize(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)

	photo := f.mustUpload(t, f.ana, goblin.ID)

	name := "minis/" + goblin.ID.String() + "/" + photo.ID.String()
	if photo.ThumbnailURL != f.store.ThumbnailURL(name) || photo.FullURL != f.store.FullURL(name) {
		t.Errorf("links = %q and %q, want the store's thumbnail and full size of %s", photo.ThumbnailURL, photo.FullURL, name)
	}
}

func TestCard7_Rule7_TheImageStaysInStorageAndThePhotoOnlyPointsToIt(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)

	photo := f.mustUpload(t, f.ana, goblin.ID)

	if !f.store.Has("minis/" + goblin.ID.String() + "/" + photo.ID.String()) {
		t.Error("the image is not in the image store")
	}
}

func TestCard7_RegisteringTheSameUploadTwiceIsRefusedAndKeepsThePhoto(t *testing.T) {
	f := newFixture(t)
	goblin := f.goblin(t, f.ana)
	photo := f.mustUpload(t, f.ana, goblin.ID)

	_, err := f.photos.Register(t.Context(), f.ana, goblin.ID, photo.ID)

	if !errors.Is(err, photos.ErrAlreadyAdded) {
		t.Fatalf("error = %v, want ErrAlreadyAdded", err)
	}
	if len(f.photosOf(t, goblin.ID)) != 1 || !f.store.Has("minis/"+goblin.ID.String()+"/"+photo.ID.String()) {
		t.Error("the first registration's Photo or file is gone")
	}
}
