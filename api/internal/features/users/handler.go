package users

import (
	"errors"
	"net/http"

	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
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
	mux.Handle("GET /api/v1/me", requireUser(http.HandlerFunc(h.me)))
	mux.Handle("PATCH /api/v1/me", requireUser(http.HandlerFunc(h.updateMe)))
}

// MeResponse is the logged-in User's profile. The members feature lists Users in the same shape plus active.
type MeResponse struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

// NewMeResponse returns user as JSON.
func NewMeResponse(user User) MeResponse {
	return MeResponse{ID: user.ID.String(), Email: user.Email, DisplayName: user.DisplayName, Role: string(user.Role)}
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, NewMeResponse(CurrentUser(r.Context())))
}

type profileRequest struct {
	DisplayName string `json:"displayName"`
}

// updateMe saves the logged-in User's profile (Card 3).
func (h *Handler) updateMe(w http.ResponseWriter, r *http.Request) {
	var request profileRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteInvalidJSON(w)
		return
	}
	updated, err := h.service.UpdateProfile(r.Context(), CurrentUser(r.Context()), Profile(request))
	var problems validation.Errors
	switch {
	case errors.As(err, &problems):
		httpx.WriteValidationProblem(w, problems)
	case err != nil:
		httpx.WriteInternalError(w, r, err)
	default:
		httpx.WriteJSON(w, http.StatusOK, NewMeResponse(updated))
	}
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
