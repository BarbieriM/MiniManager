package members

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Messages from Card 4 and for the Members page.
const (
	forbiddenMessage      = "Only an admin can manage members."
	lastAdminMessage      = "There must be at least one admin."
	deactivateSelfMessage = "Ask another admin to deactivate you."
	notFoundMessage       = "This user does not exist."
)

// Handler exposes the Members page under /admin/users.
type Handler struct {
	service *Service
}

// NewHandler returns a Handler for service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register adds the Members routes to mux, each wrapped in requireUser; the service checks the Role.
func (h *Handler) Register(mux *http.ServeMux, requireUser func(http.Handler) http.Handler) {
	mux.Handle("GET /api/v1/admin/users", requireUser(http.HandlerFunc(h.list)))
	mux.Handle("PATCH /api/v1/admin/users/{id}", requireUser(http.HandlerFunc(h.update)))
}

type memberResponse struct {
	users.MeResponse
	Active bool `json:"active"`
}

func toResponse(user users.User) memberResponse {
	return memberResponse{MeResponse: users.NewMeResponse(user), Active: user.Active}
}

type listResponse struct {
	Items    []memberResponse `json:"items"`
	Total    int              `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"pageSize"`
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	listed, err := h.service.List(r.Context(), users.CurrentUser(r.Context()))
	if err != nil {
		writeError(w, r, err)
		return
	}
	items := make([]memberResponse, len(listed))
	for i, user := range listed {
		items[i] = toResponse(user)
	}
	httpx.WriteJSON(w, http.StatusOK, listResponse{Items: items, Total: len(items), Page: 1, PageSize: len(items)})
}

// updateRequest changes the Role, the active state, or both; a missing field is left as it is.
type updateRequest struct {
	Role   *users.Role `json:"role"`
	Active *bool       `json:"active"`
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.WriteProblem(w, http.StatusNotFound, notFoundMessage)
		return
	}
	var request updateRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteInvalidJSON(w)
		return
	}
	updated, err := h.service.Update(r.Context(), users.CurrentUser(r.Context()), id, users.AccessChange{Role: request.Role, Active: request.Active})
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, toResponse(updated))
}

func writeError(w http.ResponseWriter, r *http.Request, err error) {
	var problems validation.Errors
	switch {
	case errors.As(err, &problems):
		httpx.WriteValidationProblem(w, problems)
	case errors.Is(err, users.ErrForbidden):
		httpx.WriteProblem(w, http.StatusForbidden, forbiddenMessage)
	case errors.Is(err, users.ErrLastAdmin):
		httpx.WriteProblem(w, http.StatusConflict, lastAdminMessage)
	case errors.Is(err, users.ErrDeactivateSelf):
		httpx.WriteProblem(w, http.StatusConflict, deactivateSelfMessage)
	case errors.Is(err, users.ErrNotFound):
		httpx.WriteProblem(w, http.StatusNotFound, notFoundMessage)
	default:
		httpx.WriteInternalError(w, r, err)
	}
}
