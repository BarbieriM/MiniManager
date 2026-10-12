package images

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func newTestCloudinary(serverURL string, client *http.Client) *Cloudinary {
	return &Cloudinary{
		Account: Account{CloudName: "minis", APIKey: "key123", APISecret: "secret456"},
		APIBase: serverURL, DeliveryBase: "https://res.example.com", Client: client,
		Now: func() time.Time { return time.Unix(1760000000, 0) },
	}
}

func TestCloudinary_SignsOneExactNameThatCannotOverwriteAFile(t *testing.T) {
	cloudinary := newTestCloudinary("https://api.example.com", http.DefaultClient)

	signed := cloudinary.SignUpload("minis/m1/p1")

	if signed.URL != "https://api.example.com/v1_1/minis/image/upload" {
		t.Errorf("URL = %q", signed.URL)
	}
	fields := signed.Fields
	if fields["public_id"] != "minis/m1/p1" || fields["api_key"] != "key123" || fields["timestamp"] != "1760000000" {
		t.Errorf("fields = %v", fields)
	}
	if fields["overwrite"] != "false" {
		t.Errorf("overwrite = %q, want false: a signature must not be able to replace a checked Photo", fields["overwrite"])
	}
	if _, resized := fields["transformation"]; resized {
		t.Error("the upload is resized as it is stored, so the server could not check the original's size")
	}
	// Cloudinary's signature: the signed parameters sorted by name, joined with &, then the secret, as SHA-1.
	toSign := "overwrite=false&public_id=minis/m1/p1&timestamp=1760000000" + "secret456"
	sum := sha1.Sum([]byte(toSign))
	if fields["signature"] != hex.EncodeToString(sum[:]) {
		t.Errorf("signature = %q, want the SHA-1 of the sorted parameters and the secret", fields["signature"])
	}
	if _, leaked := fields["api_secret"]; leaked {
		t.Error("the secret is in the fields sent to the browser")
	}
}

func TestCloudinary_ReadsTheStoredImagesRealDetails(t *testing.T) {
	var path, user, password string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path
		user, password, _ = r.BasicAuth()
		_ = json.NewEncoder(w).Encode(map[string]any{"format": "jpg", "bytes": 3145728, "width": 1200, "height": 1600})
	}))
	defer server.Close()

	details, err := newTestCloudinary(server.URL, server.Client()).Details(t.Context(), "minis/m1/p1")

	if err != nil {
		t.Fatalf("Details: %v", err)
	}
	if path != "/v1_1/minis/resources/image/upload/minis/m1/p1" || user != "key123" || password != "secret456" {
		t.Errorf("request path %q, auth %q:%q", path, user, password)
	}
	if details != (Details{Format: "jpg", Bytes: 3145728, Width: 1200, Height: 1600}) {
		t.Errorf("details = %+v", details)
	}
}

func TestCloudinary_AMissingImageIsErrNotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	_, err := newTestCloudinary(server.URL, server.Client()).Details(t.Context(), "minis/m1/p1")

	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("error = %v, want ErrNotFound", err)
	}
}

func TestCloudinary_DeletesOneImageAndAWholeFolder(t *testing.T) {
	var requests []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests = append(requests, r.Method+" "+r.URL.Path+"?"+r.URL.RawQuery)
		_, _ = w.Write([]byte(`{"deleted":{}}`))
	}))
	defer server.Close()
	cloudinary := newTestCloudinary(server.URL, server.Client())

	if err := cloudinary.Delete(t.Context(), "minis/m1/p1"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if err := cloudinary.DeleteFolder(t.Context(), "minis/m1"); err != nil {
		t.Fatalf("DeleteFolder: %v", err)
	}

	want := []string{
		"DELETE /v1_1/minis/resources/image/upload?public_ids%5B%5D=minis%2Fm1%2Fp1",
		"DELETE /v1_1/minis/resources/image/upload?prefix=minis%2Fm1%2F",
	}
	if strings.Join(requests, "\n") != strings.Join(want, "\n") {
		t.Errorf("requests =\n%s\nwant\n%s", strings.Join(requests, "\n"), strings.Join(want, "\n"))
	}
}

func TestCloudinary_AFailedDeleteNamesOnlyTheStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	err := newTestCloudinary(server.URL, server.Client()).Delete(t.Context(), "minis/m1/p1")

	if err == nil || !strings.Contains(err.Error(), "500") || strings.Contains(err.Error(), "secret456") {
		t.Errorf("error = %v, want one naming the status and never the secret", err)
	}
}

func TestCloudinary_BuildsTheThumbnailAndFullSizeLinks(t *testing.T) {
	cloudinary := newTestCloudinary("https://api.example.com", http.DefaultClient)

	if got := cloudinary.ThumbnailURL("minis/m1/p1"); got != "https://res.example.com/minis/image/upload/c_limit,w_400,h_400,f_auto,q_auto/minis/m1/p1" {
		t.Errorf("thumbnail = %q", got)
	}
	if got := cloudinary.FullURL("minis/m1/p1"); got != "https://res.example.com/minis/image/upload/c_limit,w_1600,h_1600,f_auto,q_auto/minis/m1/p1" {
		t.Errorf("full size = %q", got)
	}
}
