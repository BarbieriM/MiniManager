package main

import (
	"net/http"
	"testing"

	"github.com/BarbieriM/MiniManager/api/internal/platform/images"
)

type uploadBody struct {
	PhotoID string            `json:"photoId"`
	URL     string            `json:"url"`
	Fields  map[string]string `json:"fields"`
}

type photoBody struct {
	ID           string `json:"id"`
	ThumbnailURL string `json:"thumbnailUrl"`
	FullURL      string `json:"fullUrl"`
	IsCover      bool   `json:"isCover"`
}

// uploadPhoto signs, stores the file as the browser's upload would, and registers it, returning the register answer.
func (s testServer) uploadPhoto(t *testing.T, accessToken, miniatureID string) *http.Response {
	t.Helper()
	signed := s.doAs(t, accessToken, http.MethodPost, "/api/v1/miniatures/"+miniatureID+"/photos/signature", "")
	if signed.StatusCode != http.StatusOK {
		return signed
	}
	upload := decode[uploadBody](t, signed)
	s.images.Upload(upload.Fields["public_id"], images.Details{Format: "jpg", Bytes: 3 << 20, Width: 1200, Height: 1600})
	return s.doAs(t, accessToken, http.MethodPost, "/api/v1/miniatures/"+miniatureID+"/photos", `{"photoId":"`+upload.PhotoID+`"}`)
}

func TestCard7_AcceptanceCriterion1_AnUploadBecomesTheCoverInTheDetailsAndTheList(t *testing.T) {
	server := newTestServer(t)
	admin := server.adminToken(t)
	goblin := server.createGoblin(t, admin)

	registered := server.uploadPhoto(t, admin, goblin.ID)
	if registered.StatusCode != http.StatusCreated {
		t.Fatalf("register: status %d", registered.StatusCode)
	}
	photo := decode[photoBody](t, registered)

	details := decode[struct {
		Photos        []photoBody `json:"photos"`
		PhotosEnabled bool        `json:"photosEnabled"`
	}](t, server.doAs(t, admin, http.MethodGet, "/api/v1/miniatures/"+goblin.ID, ""))
	if !details.PhotosEnabled || len(details.Photos) != 1 || !details.Photos[0].IsCover || details.Photos[0].ID != photo.ID {
		t.Errorf("details = %+v, want the one Photo as cover", details)
	}
	list := decode[struct {
		Items []struct {
			CoverThumbnailURL *string `json:"coverThumbnailUrl"`
		} `json:"items"`
	}](t, server.doAs(t, admin, http.MethodGet, "/api/v1/miniatures", ""))
	if list.Items[0].CoverThumbnailURL == nil || *list.Items[0].CoverThumbnailURL != photo.ThumbnailURL {
		t.Errorf("list cover = %v, want %q", list.Items[0].CoverThumbnailURL, photo.ThumbnailURL)
	}
}

func TestCard7_Rule8_AMiniWithoutPhotosHasANullCover(t *testing.T) {
	server := newTestServer(t)
	admin := server.adminToken(t)
	server.createGoblin(t, admin)

	list := decode[struct {
		Items []map[string]any `json:"items"`
	}](t, server.doAs(t, admin, http.MethodGet, "/api/v1/miniatures", ""))

	if cover, present := list.Items[0]["coverThumbnailUrl"]; !present || cover != nil {
		t.Errorf("coverThumbnailUrl = %v (present %v), want null", cover, present)
	}
}

func TestCard7_Rule5_AMemberGets403ForThePhotosOfSomeoneElsesMini(t *testing.T) {
	server := newTestServer(t)
	goblin := server.createGoblin(t, server.adminToken(t))
	server.addMember(t, "ana@example.com", "Ana")

	response := server.doAs(t, server.accessToken(t, "ana@example.com", memberPassword), http.MethodPost, "/api/v1/miniatures/"+goblin.ID+"/photos/signature", "")

	assertProblem(t, response, http.StatusForbidden, "You can only change your own miniatures.")
}

func TestCard7_Rule1_AFourthPhotoIsAFieldErrorWithTheCardMessage(t *testing.T) {
	server := newTestServer(t)
	admin := server.adminToken(t)
	goblin := server.createGoblin(t, admin)
	for range 3 {
		server.uploadPhoto(t, admin, goblin.ID)
	}

	response := server.doAs(t, admin, http.MethodPost, "/api/v1/miniatures/"+goblin.ID+"/photos/signature", "")

	problem := assertProblem(t, response, http.StatusBadRequest, "")
	if len(problem.Errors) != 1 || problem.Errors[0].Field != "photo" {
		t.Errorf("errors = %+v, want one on photo", problem.Errors)
	}
}

func TestCard7_Rule3_MakingACoverAndRemovingAPhotoThroughTheRouter(t *testing.T) {
	server := newTestServer(t)
	admin := server.adminToken(t)
	goblin := server.createGoblin(t, admin)
	first := decode[photoBody](t, server.uploadPhoto(t, admin, goblin.ID))
	second := decode[photoBody](t, server.uploadPhoto(t, admin, goblin.ID))

	covered := server.doAs(t, admin, http.MethodPatch, "/api/v1/miniatures/"+goblin.ID+"/photos/"+second.ID, `{"isCover":true}`)
	listed := decode[struct {
		Photos []photoBody `json:"photos"`
	}](t, covered)
	if covered.StatusCode != http.StatusOK || listed.Photos[0].IsCover || !listed.Photos[1].IsCover {
		t.Fatalf("make cover: status %d, photos %+v", covered.StatusCode, listed.Photos)
	}

	removed := server.doAs(t, admin, http.MethodDelete, "/api/v1/miniatures/"+goblin.ID+"/photos/"+first.ID, "")
	if removed.StatusCode != http.StatusNoContent {
		t.Fatalf("remove: status %d", removed.StatusCode)
	}
	gone := server.doAs(t, admin, http.MethodDelete, "/api/v1/miniatures/"+goblin.ID+"/photos/"+first.ID, "")
	assertProblem(t, gone, http.StatusNotFound, "This photo no longer exists.")
}

func TestCard7_WithoutCloudinaryThePhotoEndpointsAnswer503(t *testing.T) {
	server := newTestServerWith(t, nil)
	admin := server.adminToken(t)
	goblin := server.createGoblin(t, admin)

	response := server.doAs(t, admin, http.MethodPost, "/api/v1/miniatures/"+goblin.ID+"/photos/signature", "")

	assertProblem(t, response, http.StatusServiceUnavailable, "Photos are not set up.")
	details := decode[struct {
		PhotosEnabled bool `json:"photosEnabled"`
	}](t, server.doAs(t, admin, http.MethodGet, "/api/v1/miniatures/"+goblin.ID, ""))
	if details.PhotosEnabled {
		t.Error("photosEnabled = true, want false")
	}
}
