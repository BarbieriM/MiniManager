// Package images keeps Photo files in Cloudinary (ADR 0005): it signs browser uploads, reads what was stored,
// deletes files and builds the links that show them. It calls Cloudinary's HTTP API with net/http, no SDK.
package images

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Cloudinary's addresses in production.
const (
	apiBase      = "https://api.cloudinary.com"
	deliveryBase = "https://res.cloudinary.com"
)

// The two sizes a Photo is shown at (Card 7 rule 4), made from the stored original when shown. The original is kept
// as uploaded, so the server can check its real format and size (ADR 0005); delivered images are turned upright and
// carry no location data, and f_auto and q_auto pick the lightest format and quality the browser handles.
const (
	thumbnailTransformation = "c_limit,w_400,h_400,f_auto,q_auto"
	fullTransformation      = "c_limit,w_1600,h_1600,f_auto,q_auto"
)

// requestTimeout keeps a slow Cloudinary from holding a request open.
const requestTimeout = 10 * time.Second

// ErrNotFound means no stored image has that name, for example because its upload never finished.
var ErrNotFound = errors.New("image not found")

// SignedUpload is what the browser needs to upload one file straight to Cloudinary: where to send it and the
// form fields to send with it, signed for one exact name.
type SignedUpload struct {
	URL    string
	Fields map[string]string
}

// Details is what Cloudinary measured about a stored image.
type Details struct {
	Format string
	Bytes  int
	Width  int
	Height int
}

// Account is one Cloudinary account's settings. The secret signs on the server only. Folder, when set, is put in
// front of every name, so environments sharing the account (prod, dev) never touch each other's files.
type Account struct {
	CloudName string
	APIKey    string
	APISecret string
	Folder    string
}

// Cloudinary is the client for one Account. APIBase, DeliveryBase, Client and Now are set by NewCloudinary and
// replaced in tests.
type Cloudinary struct {
	Account
	APIBase      string
	DeliveryBase string
	Client       *http.Client
	Now          func() time.Time
}

// NewCloudinary returns the client for account.
func NewCloudinary(account Account) *Cloudinary {
	return &Cloudinary{Account: account, APIBase: apiBase, DeliveryBase: deliveryBase, Client: http.DefaultClient, Now: time.Now}
}

// SignUpload signs an upload of exactly name that may not replace an existing file, so a signature cannot be used
// again to swap a Photo after the server checked it. The secret signs on the server and is never part of the
// fields; Cloudinary refuses any parameter that was not signed.
func (c *Cloudinary) SignUpload(name string) SignedUpload {
	signed := map[string]string{
		"overwrite": "false",
		"public_id": c.inFolder(name),
		"timestamp": strconv.FormatInt(c.Now().Unix(), 10),
	}
	fields := map[string]string{"api_key": c.APIKey, "signature": c.signature(signed)}
	for key, value := range signed {
		fields[key] = value
	}
	return SignedUpload{URL: c.apiURL("/image/upload"), Fields: fields}
}

// signature is Cloudinary's upload signature: the parameters sorted by name as key=value joined with &, followed
// by the secret, hashed with SHA-1.
func (c *Cloudinary) signature(parameters map[string]string) string {
	keys := make([]string, 0, len(parameters))
	for key := range parameters {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	pairs := make([]string, len(keys))
	for i, key := range keys {
		pairs[i] = key + "=" + parameters[key]
	}
	sum := sha1.Sum([]byte(strings.Join(pairs, "&") + c.APISecret))
	return hex.EncodeToString(sum[:])
}

// Details reads the real format, size and dimensions of the stored image name.
func (c *Cloudinary) Details(ctx context.Context, name string) (Details, error) {
	response, err := c.adminRequest(ctx, http.MethodGet, "/resources/image/upload/"+c.inFolder(name), nil)
	if err != nil {
		return Details{}, err
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return Details{}, ErrNotFound
	}
	if err := checkStatus(response); err != nil {
		return Details{}, err
	}
	var details Details
	if err := json.NewDecoder(response.Body).Decode(&details); err != nil {
		return Details{}, fmt.Errorf("read image details: %w", err)
	}
	return details, nil
}

// Delete removes the stored image name. A name that is already gone is not an error.
func (c *Cloudinary) Delete(ctx context.Context, name string) error {
	return c.deleteWhere(ctx, url.Values{"public_ids[]": {c.inFolder(name)}})
}

// DeleteFolder removes every stored image whose name starts with folder/, such as all of one Miniature's Photos.
func (c *Cloudinary) DeleteFolder(ctx context.Context, folder string) error {
	return c.deleteWhere(ctx, url.Values{"prefix": {c.inFolder(strings.TrimSuffix(folder, "/")) + "/"}})
}

func (c *Cloudinary) deleteWhere(ctx context.Context, query url.Values) error {
	response, err := c.adminRequest(ctx, http.MethodDelete, "/resources/image/upload", query)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	return checkStatus(response)
}

// ThumbnailURL is the link to name at about 400 px, for lists and tiles.
func (c *Cloudinary) ThumbnailURL(name string) string {
	return c.deliveryURL(thumbnailTransformation, name)
}

// FullURL is the link to name at about 1600 px, for the details page.
func (c *Cloudinary) FullURL(name string) string {
	return c.deliveryURL(fullTransformation, name)
}

func (c *Cloudinary) deliveryURL(transformation, name string) string {
	return fmt.Sprintf("%s/%s/image/upload/%s/%s", c.DeliveryBase, c.CloudName, transformation, c.inFolder(name))
}

// inFolder puts the account's Folder, if any, in front of name.
func (c *Cloudinary) inFolder(name string) string {
	if c.Folder == "" {
		return name
	}
	return strings.Trim(c.Folder, "/") + "/" + name
}

func (c *Cloudinary) apiURL(path string) string {
	return c.APIBase + "/v1_1/" + c.CloudName + path
}

// adminRequest calls Cloudinary's Admin API, which authenticates with the key and secret as basic auth.
func (c *Cloudinary) adminRequest(ctx context.Context, method, path string, query url.Values) (*http.Response, error) {
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	address := c.apiURL(path)
	if len(query) > 0 {
		address += "?" + query.Encode()
	}
	request, err := http.NewRequestWithContext(ctx, method, address, nil)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("build cloudinary request: %w", err)
	}
	request.SetBasicAuth(c.APIKey, c.APISecret)
	response, err := c.Client.Do(request)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("call cloudinary: %w", err)
	}
	response.Body = cancelOnClose{ReadCloser: response.Body, cancel: cancel}
	return response, nil
}

// checkStatus turns a non-2xx answer into an error that names only the status.
func checkStatus(response *http.Response) error {
	if response.StatusCode < 200 || response.StatusCode > 299 {
		return fmt.Errorf("cloudinary answered %d", response.StatusCode)
	}
	return nil
}
