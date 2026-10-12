package miniatures

import (
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Messages from Cards 4 and 5.
const (
	notFoundMessage  = "This miniature no longer exists."
	forbiddenMessage = "You can only change your own miniatures."
	conflictMessage  = "Someone changed this miniature while you were editing. Reload to see their changes."
)

// serverOwnedFields are set by the server and refused in a request body (Card 5 rule 6).
var serverOwnedFields = []string{"id", "createdAt", "updatedAt", "createdBy", "owner", "canChange"}

// Handler exposes the Service under /api/v1/miniatures.
type Handler struct {
	service *Service
}

// NewHandler returns a Handler for service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register adds the miniatures routes to mux, each wrapped in requireUser.
func (h *Handler) Register(mux *http.ServeMux, requireUser func(http.Handler) http.Handler) {
	mux.Handle("GET /api/v1/miniatures", requireUser(http.HandlerFunc(h.list)))
	mux.Handle("POST /api/v1/miniatures", requireUser(http.HandlerFunc(h.create)))
	mux.Handle("GET /api/v1/miniatures/{id}", requireUser(http.HandlerFunc(h.get)))
	mux.Handle("PUT /api/v1/miniatures/{id}", requireUser(http.HandlerFunc(h.update)))
	mux.Handle("DELETE /api/v1/miniatures/{id}", requireUser(http.HandlerFunc(h.delete)))
}

// miniatureRequest is the body of a create or update. Version is required on update and refused on create.
type miniatureRequest struct {
	Name            string   `json:"name"`
	OwnerID         *string  `json:"ownerId"`
	CreatureType    string   `json:"creatureType"`
	Size            string   `json:"size"`
	ChallengeRating *float64 `json:"challengeRating"`
	Quantity        *int     `json:"quantity"`
	PaintStatus     string   `json:"paintStatus"`
	Tags            []string `json:"tags"`
	StorageLocation string   `json:"storageLocation"`
	Manufacturer    string   `json:"manufacturer"`
	Notes           string   `json:"notes"`
	Version         *int     `json:"version"`
}

type ownerResponse struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

type miniatureResponse struct {
	ID              string        `json:"id"`
	Name            string        `json:"name"`
	Owner           ownerResponse `json:"owner"`
	CreatureType    string        `json:"creatureType"`
	Size            string        `json:"size"`
	ChallengeRating *float64      `json:"challengeRating"`
	Quantity        int           `json:"quantity"`
	PaintStatus     string        `json:"paintStatus"`
	Tags            []string      `json:"tags"`
	StorageLocation string        `json:"storageLocation"`
	Manufacturer    string        `json:"manufacturer"`
	Notes           string        `json:"notes"`
	Version         int           `json:"version"`
	CreatedAt       time.Time     `json:"createdAt"`
	UpdatedAt       time.Time     `json:"updatedAt"`
	CanChange       bool          `json:"canChange"`
}

type pageResponse struct {
	Items    []miniatureResponse `json:"items"`
	Total    int                 `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"pageSize"`
	// CatalogTotal counts every Miniature, for "48 of 312 minis" (Card 6 rule 7).
	CatalogTotal int `json:"catalogTotal"`
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	options, problems := parseListOptions(r)
	if len(problems) > 0 {
		httpx.WriteValidationProblem(w, problems)
		return
	}
	page, err := h.service.List(r.Context(), users.CurrentUser(r.Context()), options)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	items := make([]miniatureResponse, len(page.Items))
	for i, miniature := range page.Items {
		items[i] = toResponse(miniature)
	}
	httpx.WriteJSON(w, http.StatusOK, pageResponse{
		Items: items, Total: page.Total, Page: page.Page, PageSize: page.PageSize, CatalogTotal: page.CatalogTotal,
	})
}

// parseListOptions reads page, pageSize, sort and the filters from the query; the service checks their values
// (Cards 5 and 6). Unknown parameters are ignored, and text that is not a whole number is a problem here.
func parseListOptions(r *http.Request) (ListOptions, validation.Errors) {
	query := r.URL.Query()
	// The filter registry reads the filter parameters it knows from the same query (Card 6).
	options := ListOptions{Sort: Sort(query.Get("sort")), Filters: query}
	var problems validation.Errors
	if text := query.Get("page"); text != "" {
		// An explicit 0 would read as "not given" in the service, so it is refused here.
		page, err := strconv.Atoi(text)
		if err != nil || page < 1 {
			problems.Add("page", "Page must be a whole number from 1.")
		}
		options.Page = page
	}
	if text := query.Get("pageSize"); text != "" {
		pageSize, err := strconv.Atoi(text)
		if err != nil || pageSize < 1 {
			problems.Add("pageSize", "Page size must be a whole number from 1 to 100.")
		}
		options.PageSize = pageSize
	}
	return options, problems
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	request, ok := decodeMiniature(w, r)
	if !ok {
		return
	}
	if request.Version != nil {
		httpx.WriteValidationProblem(w, validation.Errors{{Field: "version", Message: "Version is set by the server."}})
		return
	}
	input, problems := request.toInput()
	if len(problems) > 0 {
		httpx.WriteValidationProblem(w, problems)
		return
	}
	miniature, err := h.service.Create(r.Context(), users.CurrentUser(r.Context()), input)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, toResponse(miniature))
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	miniature, err := h.service.Get(r.Context(), users.CurrentUser(r.Context()), id)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, toResponse(miniature))
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	request, ok := decodeMiniature(w, r)
	if !ok {
		return
	}
	if request.Version == nil {
		httpx.WriteValidationProblem(w, validation.Errors{{Field: "version", Message: "Version is required."}})
		return
	}
	input, problems := request.toInput()
	if len(problems) > 0 {
		httpx.WriteValidationProblem(w, problems)
		return
	}
	miniature, err := h.service.Update(r.Context(), users.CurrentUser(r.Context()), id, *request.Version, input)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, toResponse(miniature))
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := h.service.Delete(r.Context(), users.CurrentUser(r.Context()), id); err != nil {
		writeServiceError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// pathID reads {id}. A malformed id cannot name a Miniature, so it gets the same 404 as a missing one.
func pathID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.WriteProblem(w, http.StatusNotFound, notFoundMessage)
		return uuid.UUID{}, false
	}
	return id, true
}

// decodeMiniature reads the body. Server-owned fields and values of the wrong type become field errors, so the
// form can show them next to the right field ("2.5" for quantity is Card 5's quantity message).
func decodeMiniature(w http.ResponseWriter, r *http.Request) (miniatureRequest, bool) {
	var request miniatureRequest
	err := httpx.DecodeJSON(w, r, &request)
	if err == nil {
		return request, true
	}
	var typeError *json.UnmarshalTypeError
	switch {
	case errors.As(err, &typeError) && typeError.Field == "quantity":
		httpx.WriteValidationProblem(w, validation.Errors{{Field: "quantity", Message: quantityMessage}})
	case errors.As(err, &typeError):
		httpx.WriteValidationProblem(w, validation.Errors{{Field: typeError.Field, Message: "This value has the wrong type."}})
	case serverOwnedField(err) != "":
		httpx.WriteValidationProblem(w, validation.Errors{{Field: serverOwnedField(err), Message: "This field is set by the server."}})
	default:
		httpx.WriteInvalidJSON(w)
	}
	return miniatureRequest{}, false
}

// serverOwnedField returns the field name when err is an unknown-field error for a server-owned field.
func serverOwnedField(err error) string {
	// encoding/json reports unknown fields only as text: `json: unknown field "createdAt"`.
	_, after, found := strings.Cut(err.Error(), `unknown field "`)
	if !found {
		return ""
	}
	field, _, _ := strings.Cut(after, `"`)
	if slices.Contains(serverOwnedFields, field) {
		return field
	}
	return ""
}

func (request miniatureRequest) toInput() (Input, validation.Errors) {
	input := Input{
		Name:            request.Name,
		CreatureType:    request.CreatureType,
		Size:            request.Size,
		ChallengeRating: request.ChallengeRating,
		Quantity:        request.Quantity,
		PaintStatus:     request.PaintStatus,
		Tags:            request.Tags,
		StorageLocation: request.StorageLocation,
		Manufacturer:    request.Manufacturer,
		Notes:           request.Notes,
	}
	if request.OwnerID != nil {
		ownerID, err := uuid.Parse(*request.OwnerID)
		if err != nil {
			return Input{}, validation.Errors{{Field: "ownerId", Message: "Pick an owner from the list."}}
		}
		input.OwnerID = &ownerID
	}
	return input, nil
}

func writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	var problems validation.Errors
	switch {
	case errors.As(err, &problems):
		httpx.WriteValidationProblem(w, problems)
	case errors.Is(err, ErrNotFound):
		httpx.WriteProblem(w, http.StatusNotFound, notFoundMessage)
	case errors.Is(err, ErrForbidden):
		httpx.WriteProblem(w, http.StatusForbidden, forbiddenMessage)
	case errors.Is(err, ErrVersionConflict):
		httpx.WriteProblem(w, http.StatusConflict, conflictMessage)
	default:
		httpx.WriteInternalError(w, r, err)
	}
}

func toResponse(miniature Miniature) miniatureResponse {
	return miniatureResponse{
		ID:              miniature.ID.String(),
		Name:            miniature.Name,
		Owner:           ownerResponse{ID: miniature.Owner.ID.String(), DisplayName: miniature.Owner.DisplayName},
		CreatureType:    miniature.CreatureType,
		Size:            miniature.Size,
		ChallengeRating: miniature.ChallengeRating,
		Quantity:        miniature.Quantity,
		PaintStatus:     miniature.PaintStatus,
		Tags:            miniature.Tags,
		StorageLocation: miniature.StorageLocation,
		Manufacturer:    miniature.Manufacturer,
		Notes:           miniature.Notes,
		Version:         miniature.Version,
		CreatedAt:       miniature.CreatedAt,
		UpdatedAt:       miniature.UpdatedAt,
		CanChange:       miniature.CanChange,
	}
}
