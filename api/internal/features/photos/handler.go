package photos

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/BarbieriM/MiniManager/api/internal/features/miniatures"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Messages for this feature's own errors.
const (
	notFoundMessage     = "This photo no longer exists."
	notSetUpMessage     = "Photos are not set up."
	alreadyAddedMessage = "This photo was already added."
)

// Handler exposes a Miniature's Photos under /miniatures/{id}/photos.
type Handler struct {
	service *Service
}

// NewHandler returns a Handler for service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register adds the photo routes to mux, each wrapped in requireUser; the service checks who may change them.
func (h *Handler) Register(mux *http.ServeMux, requireUser func(http.Handler) http.Handler) {
	mux.Handle("POST /api/v1/miniatures/{id}/photos/signature", requireUser(http.HandlerFunc(h.sign)))
	mux.Handle("POST /api/v1/miniatures/{id}/photos", requireUser(http.HandlerFunc(h.register)))
	mux.Handle("PATCH /api/v1/miniatures/{id}/photos/{photoId}", requireUser(http.HandlerFunc(h.update)))
	mux.Handle("DELETE /api/v1/miniatures/{id}/photos/{photoId}", requireUser(http.HandlerFunc(h.remove)))
}

type uploadResponse struct {
	PhotoID string            `json:"photoId"`
	URL     string            `json:"url"`
	Fields  map[string]string `json:"fields"`
}

func (h *Handler) sign(w http.ResponseWriter, r *http.Request) {
	miniatureID, ok := pathUUID(w, r, "id", miniatures.NotFoundMessage)
	if !ok {
		return
	}
	upload, err := h.service.Sign(r.Context(), users.CurrentUser(r.Context()), miniatureID)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, uploadResponse{PhotoID: upload.PhotoID.String(), URL: upload.URL, Fields: upload.Fields})
}

type registerRequest struct {
	PhotoID uuid.UUID `json:"photoId"`
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	miniatureID, ok := pathUUID(w, r, "id", miniatures.NotFoundMessage)
	if !ok {
		return
	}
	var request registerRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteInvalidJSON(w)
		return
	}
	photo, err := h.service.Register(r.Context(), users.CurrentUser(r.Context()), miniatureID, request.PhotoID)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, miniatures.NewPhotoResponses([]miniatures.Photo{photo})[0])
}

// updateRequest can only make a Photo the cover; there is no reordering (Card 7, clarified 2026-10-12).
type updateRequest struct {
	IsCover bool `json:"isCover"`
}

type photosResponse struct {
	Photos []miniatures.PhotoResponse `json:"photos"`
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	miniatureID, photoID, ok := pathIDs(w, r)
	if !ok {
		return
	}
	var request updateRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteInvalidJSON(w)
		return
	}
	if !request.IsCover {
		httpx.WriteValidationProblem(w, validation.Errors{{Field: "isCover", Message: "Choose a cover by sending isCover: true."}})
		return
	}
	listed, err := h.service.MakeCover(r.Context(), users.CurrentUser(r.Context()), miniatureID, photoID)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, photosResponse{Photos: miniatures.NewPhotoResponses(listed)})
}

func (h *Handler) remove(w http.ResponseWriter, r *http.Request) {
	miniatureID, photoID, ok := pathIDs(w, r)
	if !ok {
		return
	}
	if err := h.service.Remove(r.Context(), users.CurrentUser(r.Context()), miniatureID, photoID); err != nil {
		writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func pathIDs(w http.ResponseWriter, r *http.Request) (miniatureID, photoID uuid.UUID, ok bool) {
	if miniatureID, ok = pathUUID(w, r, "id", miniatures.NotFoundMessage); !ok {
		return uuid.UUID{}, uuid.UUID{}, false
	}
	photoID, ok = pathUUID(w, r, "photoId", notFoundMessage)
	return miniatureID, photoID, ok
}

// pathUUID reads an id from the path; a malformed one is something that does not exist.
func pathUUID(w http.ResponseWriter, r *http.Request, name, notFound string) (uuid.UUID, bool) {
	id, err := uuid.Parse(r.PathValue(name))
	if err != nil {
		httpx.WriteProblem(w, http.StatusNotFound, notFound)
		return uuid.UUID{}, false
	}
	return id, true
}

func writeError(w http.ResponseWriter, r *http.Request, err error) {
	var problems validation.Errors
	switch {
	case errors.As(err, &problems):
		httpx.WriteValidationProblem(w, problems)
	case errors.Is(err, ErrNotSetUp):
		httpx.WriteProblem(w, http.StatusServiceUnavailable, notSetUpMessage)
	case errors.Is(err, miniatures.ErrForbidden):
		httpx.WriteProblem(w, http.StatusForbidden, miniatures.ForbiddenMessage)
	case errors.Is(err, miniatures.ErrNotFound):
		httpx.WriteProblem(w, http.StatusNotFound, miniatures.NotFoundMessage)
	case errors.Is(err, ErrNotFound):
		httpx.WriteProblem(w, http.StatusNotFound, notFoundMessage)
	case errors.Is(err, ErrAlreadyAdded):
		httpx.WriteProblem(w, http.StatusConflict, alreadyAddedMessage)
	default:
		httpx.WriteInternalError(w, r, err)
	}
}
