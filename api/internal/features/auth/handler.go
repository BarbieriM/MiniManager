package auth

import (
	"errors"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

const (
	refreshCookieName = "refresh_token"
	// refreshCookiePath limits the cookie to the auth endpoints, so it is not sent with every API request.
	refreshCookiePath = "/api/v1/auth"
)

// Messages from Card 2's "Validations and error messages".
const (
	invalidCredentialsMessage = "Email or password is incorrect."
	lockedMessage             = "Too many attempts. Try again in 15 minutes."
	sessionExpiredMessage     = "Your session has ended. Log in again."
)

// Handler exposes the Service under /api/v1/auth.
type Handler struct {
	service *Service
}

// NewHandler returns a Handler for service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register adds the auth routes to mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/auth/login", h.login)
	mux.HandleFunc("POST /api/v1/auth/refresh", h.refresh)
	mux.HandleFunc("POST /api/v1/auth/logout", h.logout)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type sessionResponse struct {
	AccessToken string       `json:"accessToken"`
	ExpiresIn   int          `json:"expiresIn"`
	User        userResponse `json:"user"`
}

type userResponse struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var request loginRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "The request body is not valid JSON.")
		return
	}
	var problems validation.Errors
	if request.Email == "" {
		problems.Add("email", "Enter your email.")
	}
	if request.Password == "" {
		problems.Add("password", "Enter your password.")
	}
	if len(problems) > 0 {
		httpx.WriteValidationProblem(w, problems)
		return
	}

	session, err := h.service.Login(r.Context(), request.Email, request.Password)
	var locked *LockedError
	switch {
	case errors.As(err, &locked):
		w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(locked.RetryAfter.Seconds()))))
		httpx.WriteProblem(w, http.StatusTooManyRequests, lockedMessage)
	case errors.Is(err, ErrInvalidCredentials):
		httpx.WriteProblem(w, http.StatusUnauthorized, invalidCredentialsMessage)
	case err != nil:
		httpx.WriteInternalError(w, r, err)
	default:
		writeSession(w, session)
	}
}

func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil {
		httpx.WriteProblem(w, http.StatusUnauthorized, sessionExpiredMessage)
		return
	}
	session, err := h.service.Refresh(r.Context(), cookie.Value)
	switch {
	case errors.Is(err, ErrInvalidRefreshToken):
		httpx.WriteProblem(w, http.StatusUnauthorized, sessionExpiredMessage)
	case err != nil:
		httpx.WriteInternalError(w, r, err)
	default:
		writeSession(w, session)
	}
}

// logout always answers 204 and clears the cookie, whatever state the token is in and even if revoking it fails
// (Card 2 rule 6): the browser forgets the token either way, and an unrevoked one still expires in 7 days.
func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(refreshCookieName); err == nil {
		if err := h.service.Logout(r.Context(), cookie.Value); err != nil {
			log.Printf("logout: revoke refresh token: %v", err)
		}
	}
	http.SetCookie(w, newRefreshCookie("", -1))
	w.WriteHeader(http.StatusNoContent)
}

func writeSession(w http.ResponseWriter, session IssuedSession) {
	// The token was issued just now, so the cookie lives exactly as long as the token.
	http.SetCookie(w, newRefreshCookie(session.RefreshToken, int(RefreshTokenTTL/time.Second)))
	httpx.WriteJSON(w, http.StatusOK, sessionResponse{
		AccessToken: session.AccessToken,
		ExpiresIn:   int(session.ExpiresIn / time.Second),
		User: userResponse{
			ID:          session.User.ID.String(),
			DisplayName: session.User.DisplayName,
			Role:        string(session.User.Role),
		},
	})
}

// newRefreshCookie builds the refresh cookie. A negative maxAge deletes it.
func newRefreshCookie(value string, maxAge int) *http.Cookie {
	return &http.Cookie{
		Name:     refreshCookieName,
		Value:    value,
		Path:     refreshCookiePath,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	}
}
