package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/BarbieriM/MiniManager/api/internal/features/auth"
	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
)

const (
	adminEmail    = "mateus@example.com"
	adminPassword = "correct horse"
)

type testServer struct {
	handler http.Handler
	pool    *pgxpool.Pool
}

// newTestServer returns the real router over a fresh database with one Admin, and a fake built SPA.
func newTestServer(t *testing.T) testServer {
	t.Helper()
	pool := dbtest.NewDatabase(t)
	userService := users.NewService(pool)
	if _, err := userService.CreateAdmin(t.Context(), users.NewAdmin{
		Email: adminEmail, Password: adminPassword, DisplayName: "Mateus",
	}); err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	accessTokens := platformauth.NewAccessTokens([]byte("0123456789abcdef0123456789abcdef"), time.Now)
	authService, err := auth.NewService(pool, userService, accessTokens, time.Now)
	if err != nil {
		t.Fatalf("auth.NewService: %v", err)
	}

	webDir := t.TempDir()
	writeFile(t, webDir+"/index.html", "<!doctype html><title>Mini Manager</title>")
	writeFile(t, webDir+"/assets/app.js", "console.log('app')")

	return testServer{
		handler: newHandler(handlerDeps{auth: authService, webDir: webDir}),
		pool:    pool,
	}
}

func (s testServer) do(t *testing.T, method, path, body string, cookies ...*http.Cookie) *http.Response {
	t.Helper()
	request := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader(body))
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	for _, cookie := range cookies {
		request.AddCookie(cookie)
	}
	recorder := httptest.NewRecorder()
	s.handler.ServeHTTP(recorder, request)
	return recorder.Result()
}

func (s testServer) login(t *testing.T) *http.Response {
	t.Helper()
	return s.do(t, http.MethodPost, "/api/v1/auth/login",
		`{"email":"`+adminEmail+`","password":"`+adminPassword+`"}`)
}

func refreshCookie(t *testing.T, response *http.Response) *http.Cookie {
	t.Helper()
	for _, cookie := range response.Cookies() {
		if cookie.Name == "refresh_token" {
			return cookie
		}
	}
	t.Fatalf("response sets no refresh_token cookie (Set-Cookie: %q)", response.Header.Values("Set-Cookie"))
	return nil
}

func decode[T any](t *testing.T, response *http.Response) T {
	t.Helper()
	var value T
	if err := json.NewDecoder(response.Body).Decode(&value); err != nil {
		t.Fatalf("decode %s body: %v", response.Status, err)
	}
	return value
}

type sessionBody struct {
	AccessToken string `json:"accessToken"`
	ExpiresIn   int    `json:"expiresIn"`
	User        struct {
		ID          string `json:"id"`
		DisplayName string `json:"displayName"`
		Role        string `json:"role"`
	} `json:"user"`
}

func TestCard2_Rule4_LoginReturnsTheAccessTokenAndSetsTheRefreshCookie(t *testing.T) {
	server := newTestServer(t)

	response := server.login(t)

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", response.StatusCode)
	}
	body := decode[sessionBody](t, response)
	if body.AccessToken == "" || body.ExpiresIn != 900 {
		t.Errorf("accessToken empty or expiresIn = %d, want 900 seconds", body.ExpiresIn)
	}
	if body.User.ID == "" || body.User.DisplayName != "Mateus" || body.User.Role != "admin" {
		t.Errorf("user = %+v, want Mateus the admin", body.User)
	}
	cookie := refreshCookie(t, response)
	if !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteStrictMode || cookie.Path != "/api/v1/auth" {
		t.Errorf("cookie = %+v, want HttpOnly, Secure, SameSite=Strict, Path=/api/v1/auth", cookie)
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("create folder for %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

type problemBody struct {
	Status int    `json:"status"`
	Detail string `json:"detail"`
	Errors []struct {
		Field string `json:"field"`
	} `json:"errors"`
}

func assertProblem(t *testing.T, response *http.Response, status int, detail string) problemBody {
	t.Helper()
	if response.StatusCode != status {
		t.Fatalf("status = %d, want %d", response.StatusCode, status)
	}
	if contentType := response.Header.Get("Content-Type"); contentType != "application/problem+json" {
		t.Errorf("Content-Type = %q, want application/problem+json", contentType)
	}
	problem := decode[problemBody](t, response)
	if detail != "" && problem.Detail != detail {
		t.Errorf("detail = %q, want %q", problem.Detail, detail)
	}
	return problem
}

func TestCard2_Rule2_WrongCredentialsReturn401WithTheCardMessage(t *testing.T) {
	server := newTestServer(t)

	response := server.do(t, http.MethodPost, "/api/v1/auth/login", `{"email":"nobody@example.com","password":"x"}`)

	assertProblem(t, response, http.StatusUnauthorized, "Email or password is incorrect.")
}

func TestCard2_Rule3_ALockedEmailGets429WithRetryAfter(t *testing.T) {
	server := newTestServer(t)
	for range 5 {
		server.do(t, http.MethodPost, "/api/v1/auth/login", `{"email":"`+adminEmail+`","password":"wrong password"}`)
	}

	response := server.login(t)

	assertProblem(t, response, http.StatusTooManyRequests, "Too many attempts. Try again in 15 minutes.")
	if retryAfter := response.Header.Get("Retry-After"); retryAfter != "900" {
		t.Errorf("Retry-After = %q, want 900", retryAfter)
	}
}

func TestLogin_MissingFieldsReturn400WithFieldErrors(t *testing.T) {
	server := newTestServer(t)

	response := server.do(t, http.MethodPost, "/api/v1/auth/login", `{"email":""}`)

	problem := assertProblem(t, response, http.StatusBadRequest, "")
	fields := map[string]bool{}
	for _, fieldError := range problem.Errors {
		fields[fieldError.Field] = true
	}
	if !fields["email"] || !fields["password"] {
		t.Errorf("errors = %+v, want email and password", problem.Errors)
	}
}

func TestCard2_Rule5_RefreshWithTheCookieReturnsANewSessionAndCookie(t *testing.T) {
	server := newTestServer(t)
	first := refreshCookie(t, server.login(t))

	response := server.do(t, http.MethodPost, "/api/v1/auth/refresh", "", first)

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", response.StatusCode)
	}
	if body := decode[sessionBody](t, response); body.AccessToken == "" || body.User.DisplayName != "Mateus" {
		t.Errorf("body = %+v, want a new access token for Mateus", body)
	}
	if second := refreshCookie(t, response); second.Value == first.Value {
		t.Error("refresh kept the same refresh token")
	}
}

func TestRefresh_WithoutACookieReturns401(t *testing.T) {
	server := newTestServer(t)

	response := server.do(t, http.MethodPost, "/api/v1/auth/refresh", "")

	assertProblem(t, response, http.StatusUnauthorized, "")
}

func TestCard2_AcceptanceCriterion3_ARefreshTokenReplayedAfterLogoutGets401(t *testing.T) {
	server := newTestServer(t)
	cookie := refreshCookie(t, server.login(t))

	logout := server.do(t, http.MethodPost, "/api/v1/auth/logout", "", cookie)
	if logout.StatusCode != http.StatusNoContent {
		t.Fatalf("logout status = %d, want 204", logout.StatusCode)
	}
	if cleared := refreshCookie(t, logout); cleared.MaxAge >= 0 || cleared.Value != "" {
		t.Errorf("logout cookie = %+v, want it deleted", cleared)
	}

	assertProblem(t, server.do(t, http.MethodPost, "/api/v1/auth/refresh", "", cookie), http.StatusUnauthorized, "")
}

func TestCard2_Rule6_LogoutReturns204AndClearsTheCookieEvenWhenTheDatabaseFails(t *testing.T) {
	server := newTestServer(t)
	cookie := refreshCookie(t, server.login(t))
	server.pool.Close() // every query now fails

	response := server.do(t, http.MethodPost, "/api/v1/auth/logout", "", cookie)

	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", response.StatusCode)
	}
	if cleared := refreshCookie(t, response); cleared.MaxAge >= 0 {
		t.Errorf("cookie = %+v, want it deleted", cleared)
	}
}

func TestCard2_Rule6_LogoutWithoutACookieStillReturns204(t *testing.T) {
	server := newTestServer(t)

	response := server.do(t, http.MethodPost, "/api/v1/auth/logout", "")

	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", response.StatusCode)
	}
}

func bodyText(t *testing.T, response *http.Response) string {
	t.Helper()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	return string(body)
}

func TestSPA_ServesBuiltFilesAndFallsBackToIndexForClientRoutes(t *testing.T) {
	server := newTestServer(t)

	asset := server.do(t, http.MethodGet, "/assets/app.js", "")
	if asset.StatusCode != http.StatusOK || bodyText(t, asset) != "console.log('app')" {
		t.Errorf("GET /assets/app.js = %d, want the file", asset.StatusCode)
	}

	for _, path := range []string{"/", "/login", "/minis/123"} {
		response := server.do(t, http.MethodGet, path, "")
		if response.StatusCode != http.StatusOK || !strings.Contains(bodyText(t, response), "<title>Mini Manager</title>") {
			t.Errorf("GET %s = %d, want index.html", path, response.StatusCode)
		}
		if cacheControl := response.Header.Get("Cache-Control"); cacheControl != "no-cache" {
			t.Errorf("GET %s Cache-Control = %q, want no-cache", path, cacheControl)
		}
	}
}

func TestAPI_UnknownPathsReturn404ProblemInsteadOfTheSPA(t *testing.T) {
	server := newTestServer(t)

	response := server.do(t, http.MethodGet, "/api/v1/nothing-here", "")

	assertProblem(t, response, http.StatusNotFound, "")
}
