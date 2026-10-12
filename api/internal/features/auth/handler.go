package auth

import (
	"errors"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
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
	resetRequestedMessage     = "If that email exists, we sent a link."
	invalidResetMessage       = "This reset link is invalid or expired."
)

// Handler exposes the Service under /api/v1/auth.
type Handler struct {
	service *Service
}

// NewHandler returns a Handler for service.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register adds the auth routes to mux. Changing a password needs a logged-in User, so it is wrapped in
// requireUser; it sits under /auth so the browser sends the refresh cookie, which says which Session to keep.
func (h *Handler) Register(mux *http.ServeMux, requireUser func(http.Handler) http.Handler) {
	mux.HandleFunc("POST /api/v1/auth/login", h.login)
	mux.HandleFunc("POST /api/v1/auth/refresh", h.refresh)
	mux.HandleFunc("POST /api/v1/auth/logout", h.logout)
	mux.HandleFunc("POST /api/v1/auth/password-reset", h.requestReset)
	mux.HandleFunc("POST /api/v1/auth/password-reset/confirm", h.confirmReset)
	mux.Handle("POST /api/v1/auth/password", requireUser(http.HandlerFunc(h.changePassword)))
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
		httpx.WriteInvalidJSON(w)
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
		WriteSession(w, session)
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
		WriteSession(w, session)
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

// WriteSession answers with a new Session: the access token and User in the body, the refresh token in its
// cookie. Login, refresh and accepting an Invite all answer this way.
func WriteSession(w http.ResponseWriter, session IssuedSession) {
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

type resetRequest struct {
	Email string `json:"email"`
}

type messageResponse struct {
	Message string `json:"message"`
}

// requestReset always gives the same answer, whatever the email (Card 2 rule 7).
func (h *Handler) requestReset(w http.ResponseWriter, r *http.Request) {
	var request resetRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteInvalidJSON(w)
		return
	}
	if request.Email == "" {
		httpx.WriteValidationProblem(w, validation.Errors{{Field: "email", Message: "Enter your email."}})
		return
	}
	h.service.RequestPasswordReset(r.Context(), request.Email)
	httpx.WriteJSON(w, http.StatusAccepted, messageResponse{Message: resetRequestedMessage})
}

type confirmResetRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func (h *Handler) confirmReset(w http.ResponseWriter, r *http.Request) {
	var request confirmResetRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteInvalidJSON(w)
		return
	}
	err := h.service.ConfirmPasswordReset(r.Context(), request.Token, request.Password)
	var problems validation.Errors
	switch {
	case errors.As(err, &problems):
		httpx.WriteValidationProblem(w, problems)
	case errors.Is(err, ErrInvalidResetToken):
		httpx.WriteProblem(w, http.StatusGone, invalidResetMessage)
	case err != nil:
		httpx.WriteInternalError(w, r, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// changePassword changes the logged-in User's password and ends their other Sessions (Card 3 rules 2 and 3).
func (h *Handler) changePassword(w http.ResponseWriter, r *http.Request) {
	var request changePasswordRequest
	if err := httpx.DecodeJSON(w, r, &request); err != nil {
		httpx.WriteInvalidJSON(w)
		return
	}
	refreshToken := ""
	if cookie, err := r.Cookie(refreshCookieName); err == nil {
		refreshToken = cookie.Value
	}
	err := h.service.ChangePassword(r.Context(), users.CurrentUser(r.Context()), refreshToken,
		PasswordChange{Current: request.CurrentPassword, New: request.NewPassword})
	var problems validation.Errors
	switch {
	case errors.As(err, &problems):
		httpx.WriteValidationProblem(w, problems)
	case err != nil:
		httpx.WriteInternalError(w, r, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}
