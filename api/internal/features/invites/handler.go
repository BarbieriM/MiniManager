package invites

import (
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/BarbieriM/MiniManager/api/internal/features/auth"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Messages from Card 1 and for the Members page.
const (
	noLongerValidMessage = "This invite is no longer valid. Ask the admin for a new one."
	forbiddenMessage     = "Only an admin can manage invites."
	notFoundMessage      = "This invite does not exist."
	notOpenMessage       = "This invite was already accepted or cancelled."
)

// Handler exposes Invites: the invitee's pages under /invites and the Admin's under /admin/invites.
type Handler struct {
	service *Service
}

// NewHandler returns a Handler for service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register adds the invite routes to mux. The invitee's two routes need no login; the Admin's are wrapped in
// requireUser, and the service checks the Role (Card 1 rule 1).
func (h *Handler) Register(mux *http.ServeMux, requireUser func(http.Handler) http.Handler) {
	mux.HandleFunc("GET /api/v1/invites/{token}", h.check)
	mux.HandleFunc("POST /api/v1/invites/{token}/accept", h.accept)
	mux.Handle("GET /api/v1/admin/invites", requireUser(http.HandlerFunc(h.list)))
	mux.Handle("POST /api/v1/admin/invites", requireUser(http.HandlerFunc(h.send)))
	mux.Handle("POST /api/v1/admin/invites/{id}/resend", requireUser(http.HandlerFunc(h.resend)))
	mux.Handle("DELETE /api/v1/admin/invites/{id}", requireUser(http.HandlerFunc(h.cancel)))
}

type inviteResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Status    Status    `json:"status"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
}

func toResponse(invite Invite) inviteResponse {
	return inviteResponse{
		ID: invite.ID.String(), Email: invite.Email, Role: string(invite.Role), Status: invite.Status,
		ExpiresAt: invite.ExpiresAt, CreatedAt: invite.CreatedAt,
	}
}

type sentInviteResponse struct {
	inviteResponse
	Link      string `json:"link"`
	EmailSent bool   `json:"emailSent"`
}

type listResponse struct {
	Items    []inviteResponse `json:"items"`
	Total    int              `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"pageSize"`
}

func (h *Handler) check(w http.ResponseWriter, r *http.Request) {
	invite, err := h.service.Check(r.Context(), r.PathValue("token"))
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		Email string `json:"email"`
	}{Email: invite.Email})
}

type signUpRequest struct {
	DisplayName string `json:"displayName"`
	Password    string `json:"password"`
}

// accept answers like a login: the new User is logged in (Card 1 rule 6).
func (h *Handler) accept(w http.ResponseWriter, r *http.Request) {
	var request signUpRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteInvalidJSON(w)
		return
	}
	session, err := h.service.Accept(r.Context(), r.PathValue("token"), SignUp(request))
	if err != nil {
		writeError(w, r, err)
		return
	}
	auth.WriteSession(w, session)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	listed, err := h.service.List(r.Context(), users.CurrentUser(r.Context()))
	if err != nil {
		writeError(w, r, err)
		return
	}
	items := make([]inviteResponse, len(listed))
	for i, invite := range listed {
		items[i] = toResponse(invite)
	}
	httpx.WriteJSON(w, http.StatusOK, listResponse{Items: items, Total: len(items), Page: 1, PageSize: len(items)})
}

type sendRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (h *Handler) send(w http.ResponseWriter, r *http.Request) {
	var request sendRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteInvalidJSON(w)
		return
	}
	sent, err := h.service.Send(r.Context(), users.CurrentUser(r.Context()), NewInvite{Email: request.Email, Role: users.Role(request.Role)})
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, sentInviteResponse{inviteResponse: toResponse(sent.Invite), Link: sent.Link, EmailSent: sent.EmailSent})
}

func (h *Handler) resend(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	sent, err := h.service.Resend(r.Context(), users.CurrentUser(r.Context()), id)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, sentInviteResponse{inviteResponse: toResponse(sent.Invite), Link: sent.Link, EmailSent: sent.EmailSent})
}

func (h *Handler) cancel(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := h.service.Cancel(r.Context(), users.CurrentUser(r.Context()), id); err != nil {
		writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// pathID reads the {id} path value; a malformed one is an Invite that does not exist.
func pathID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.WriteProblem(w, http.StatusNotFound, notFoundMessage)
		return uuid.UUID{}, false
	}
	return id, true
}

func writeError(w http.ResponseWriter, r *http.Request, err error) {
	var problems validation.Errors
	switch {
	case errors.As(err, &problems):
		httpx.WriteValidationProblem(w, problems)
	case errors.Is(err, users.ErrForbidden):
		httpx.WriteProblem(w, http.StatusForbidden, forbiddenMessage)
	case errors.Is(err, ErrNoLongerValid):
		httpx.WriteProblem(w, http.StatusGone, noLongerValidMessage)
	case errors.Is(err, ErrNotFound):
		httpx.WriteProblem(w, http.StatusNotFound, notFoundMessage)
	case errors.Is(err, ErrNotOpen):
		httpx.WriteProblem(w, http.StatusConflict, notOpenMessage)
	default:
		httpx.WriteInternalError(w, r, err)
	}
}
