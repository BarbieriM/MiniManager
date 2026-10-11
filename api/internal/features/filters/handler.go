package filters

import (
	"net/http"

	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
)

// Handler exposes the filter definitions and the tags in use.
type Handler struct {
	service *Service
}

// NewHandler returns a Handler for service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register adds the filter routes to mux, each wrapped in requireUser.
func (h *Handler) Register(mux *http.ServeMux, requireUser func(http.Handler) http.Handler) {
	mux.Handle("GET /api/v1/filters", requireUser(http.HandlerFunc(h.definitions)))
	mux.Handle("GET /api/v1/tags", requireUser(http.HandlerFunc(h.tags)))
}

func (h *Handler) definitions(w http.ResponseWriter, r *http.Request) {
	definitions, err := h.service.Definitions(r.Context())
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, definitions)
}

type tagsResponse struct {
	Items    []Option `json:"items"`
	Total    int      `json:"total"`
	Page     int      `json:"page"`
	PageSize int      `json:"pageSize"`
}

// tags lists the tags in use for the form's suggestions, in the list envelope (CLAUDE.md, API).
func (h *Handler) tags(w http.ResponseWriter, r *http.Request) {
	inUse, err := h.service.TagsInUse(r.Context())
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}
	if inUse == nil {
		inUse = []Option{}
	}
	httpx.WriteJSON(w, http.StatusOK, tagsResponse{Items: inUse, Total: len(inUse), Page: 1, PageSize: len(inUse)})
}
