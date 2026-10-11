package users

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/BarbieriM/MiniManager/api/internal/platform/httpx"
)

// sessionEndedMessage matches the refresh endpoint's, so the web app treats both 401s the same way.
const sessionEndedMessage = "Your session has ended. Log in again."

// TokenVerifier turns an access token into a user id. platform/auth.AccessTokens is the real one.
type TokenVerifier interface {
	Verify(accessToken string) (uuid.UUID, error)
}

// currentUserKey is the context key for the logged-in User. An unexported type means no other package can
// read or overwrite the value by accident.
type currentUserKey struct{}

// RequireUser lets a request through only with a valid Bearer access token of an active User, and puts that User
// in the request context for CurrentUser. The User is loaded fresh on every request, so a role change or
// deactivation applies at once (ADR 0002 and the step 1 planning, Q6).
func (s *Service) RequireUser(tokens TokenVerifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			accessToken, found := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			if !found || accessToken == "" {
				httpx.WriteProblem(w, http.StatusUnauthorized, sessionEndedMessage)
				return
			}
			userID, err := tokens.Verify(accessToken)
			if err != nil {
				httpx.WriteProblem(w, http.StatusUnauthorized, sessionEndedMessage)
				return
			}
			user, err := s.FindByID(r.Context(), userID)
			if err != nil || !user.Active {
				httpx.WriteProblem(w, http.StatusUnauthorized, sessionEndedMessage)
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), currentUserKey{}, user)))
		})
	}
}

// CurrentUser returns the User RequireUser let through. It panics when called on a route without RequireUser,
// which is a wiring bug, not something a request can cause.
func CurrentUser(ctx context.Context) User {
	user, ok := ctx.Value(currentUserKey{}).(User)
	if !ok {
		panic("users.CurrentUser called on a route without RequireUser")
	}
	return user
}
