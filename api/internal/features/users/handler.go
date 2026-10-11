package users

import (
	"net/http"

	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
)

// Handler exposes Users under /api/v1/users.
type Handler struct {
	service *Service
}

// NewHandler returns a Handler for service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register adds the users routes to mux, each wrapped in requireUser.
func (h *Handler) Register(mux *http.ServeMux, requireUser func(http.Handler) http.Handler) {
	mux.Handle("GET /api/v1/users/options", requireUser(http.HandlerFunc(h.options)))
}

type optionResponse struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

type optionsResponse struct {
	Items    []optionResponse `json:"items"`
	Total    int              `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"pageSize"`
}

// options lists active Users for the owner picker. Every User may read it; only Admins can use it to change an
// owner, which the miniatures service enforces.
func (h *Handler) options(w http.ResponseWriter, r *http.Request) {
	active, err := h.service.ListActive(r.Context())
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}
	items := make([]optionResponse, len(active))
	for i, user := range active {
		items[i] = optionResponse{ID: user.ID.String(), DisplayName: user.DisplayName}
	}
	httpx.WriteJSON(w, http.StatusOK, optionsResponse{Items: items, Total: len(items), Page: 1, PageSize: len(items)})
}
