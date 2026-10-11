package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	platformauth "github.com/BarbieriM/MiniManager/api/internal/platform/auth"
)

const memberPassword = "member password"

// addMember stands in for Card 1's invites (build step 4): a Member who can log in with memberPassword.
func (s testServer) addMember(t *testing.T, email, displayName string) {
	t.Helper()
	hash, err := platformauth.HashPassword(memberPassword)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if _, err := s.pool.Exec(t.Context(),
		"INSERT INTO users (id, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, 'member')",
		uuid.Must(uuid.NewV7()), email, hash, displayName); err != nil {
		t.Fatalf("insert member: %v", err)
	}
}

// accessToken logs in and returns the access token.
func (s testServer) accessToken(t *testing.T, email, password string) string {
	t.Helper()
	response := s.do(t, http.MethodPost, "/api/v1/auth/login", `{"email":"`+email+`","password":"`+password+`"}`)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("login as %s: status %d", email, response.StatusCode)
	}
	return decode[sessionBody](t, response).AccessToken
}

func (s testServer) adminToken(t *testing.T) string {
	return s.accessToken(t, adminEmail, adminPassword)
}

// doAs sends a request with a Bearer access token.
func (s testServer) doAs(t *testing.T, accessToken, method, path, body string) *http.Response {
	t.Helper()
	request := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader(body))
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	if accessToken != "" {
		request.Header.Set("Authorization", "Bearer "+accessToken)
	}
	recorder := httptest.NewRecorder()
	s.handler.ServeHTTP(recorder, request)
	return recorder.Result()
}

type miniatureBody struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	CreatureType    string   `json:"creatureType"`
	Size            string   `json:"size"`
	ChallengeRating *float64 `json:"challengeRating"`
	Quantity        int      `json:"quantity"`
	PaintStatus     string   `json:"paintStatus"`
	Tags            []string `json:"tags"`
	Version         int      `json:"version"`
	CanChange       bool     `json:"canChange"`
	Owner           struct {
		ID          string `json:"id"`
		DisplayName string `json:"displayName"`
	} `json:"owner"`
}

const goblinJSON = `{"name":"Goblin","creatureType":"humanoid","size":"small"}`

func (s testServer) createGoblin(t *testing.T, accessToken string) miniatureBody {
	t.Helper()
	response := s.doAs(t, accessToken, http.MethodPost, "/api/v1/miniatures", goblinJSON)
	if response.StatusCode != http.StatusCreated {
		t.Fatalf("create: status %d", response.StatusCode)
	}
	return decode[miniatureBody](t, response)
}

func TestCard4_Rule8_CatalogEndpointsNeedAValidAccessToken(t *testing.T) {
	server := newTestServer(t)

	for _, token := range []string{"", "not-a-token"} {
		response := server.doAs(t, token, http.MethodGet, "/api/v1/miniatures", "")
		assertProblem(t, response, http.StatusUnauthorized, "Your session has ended. Log in again.")
	}
}

func TestCard2_Rule10_ADeactivatedUsersAccessTokenStopsWorkingAtOnce(t *testing.T) {
	server := newTestServer(t)
	token := server.adminToken(t)
	if _, err := server.pool.Exec(t.Context(), "UPDATE users SET active = false"); err != nil {
		t.Fatalf("deactivate: %v", err)
	}

	response := server.doAs(t, token, http.MethodGet, "/api/v1/miniatures", "")

	assertProblem(t, response, http.StatusUnauthorized, "")
}

func TestCard5_AcceptanceCriterion1_CreateReturns201WithDefaultsAndCanChange(t *testing.T) {
	server := newTestServer(t)
	token := server.adminToken(t)

	created := server.createGoblin(t, token)

	if created.Quantity != 1 || created.PaintStatus != "unpainted" || created.Version != 1 || !created.CanChange {
		t.Errorf("created = %+v; want quantity 1, unpainted, version 1, canChange", created)
	}
	if created.Owner.DisplayName != "Mateus" || created.ChallengeRating != nil || created.Tags == nil {
		t.Errorf("owner %q, challengeRating %v, tags %v; want Mateus, null and []", created.Owner.DisplayName, created.ChallengeRating, created.Tags)
	}
	got := decode[miniatureBody](t, server.doAs(t, token, http.MethodGet, "/api/v1/miniatures/"+created.ID, ""))
	if got.Name != "Goblin" {
		t.Errorf("GET name = %q", got.Name)
	}
}

type pageBody struct {
	Items    []miniatureBody `json:"items"`
	Total    int             `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"pageSize"`
}

func TestCard5_Rule10_TheListUsesTheEnvelopeAndDefaultsTo24PerPage(t *testing.T) {
	server := newTestServer(t)
	token := server.adminToken(t)
	server.createGoblin(t, token)

	response := server.doAs(t, token, http.MethodGet, "/api/v1/miniatures?unknownFilter=ignored", "")

	page := decode[pageBody](t, response)
	if response.StatusCode != http.StatusOK || page.Total != 1 || page.Page != 1 || page.PageSize != 24 || len(page.Items) != 1 {
		t.Errorf("status %d, page %+v; want 200, total 1, page 1, pageSize 24", response.StatusCode, page)
	}
}

func TestCard5_Rule10_InvalidPagingOrSortReturns400(t *testing.T) {
	server := newTestServer(t)
	token := server.adminToken(t)

	for query, field := range map[string]string{
		"pageSize=101": "pageSize", "page=0": "page", "sort=price": "sort", "page=1000000000&pageSize=100": "page",
	} {
		problem := assertProblem(t, server.doAs(t, token, http.MethodGet, "/api/v1/miniatures?"+query, ""), http.StatusBadRequest, "")
		if len(problem.Errors) != 1 || problem.Errors[0].Field != field {
			t.Errorf("%s: errors = %+v, want one on %s", query, problem.Errors, field)
		}
	}
}

func TestCard5_AcceptanceCriterion2_AFractionalQuantityIsAFieldError(t *testing.T) {
	server := newTestServer(t)

	response := server.doAs(t, server.adminToken(t), http.MethodPost, "/api/v1/miniatures",
		`{"name":"Goblin","creatureType":"humanoid","size":"small","quantity":2.5}`)

	problem := assertProblem(t, response, http.StatusBadRequest, "")
	if len(problem.Errors) != 1 || problem.Errors[0].Field != "quantity" {
		t.Errorf("errors = %+v, want one on quantity", problem.Errors)
	}
}

func TestCard5_Rule6_ServerOwnedFieldsAreRefused(t *testing.T) {
	server := newTestServer(t)

	response := server.doAs(t, server.adminToken(t), http.MethodPost, "/api/v1/miniatures",
		`{"name":"Goblin","creatureType":"humanoid","size":"small","createdAt":"2020-01-01T00:00:00Z"}`)

	problem := assertProblem(t, response, http.StatusBadRequest, "")
	if len(problem.Errors) != 1 || problem.Errors[0].Field != "createdAt" {
		t.Errorf("errors = %+v, want one on createdAt", problem.Errors)
	}
}

func TestCard4_AcceptanceCriterion2_AMembersPutOnSomeoneElsesMiniatureGets403(t *testing.T) {
	server := newTestServer(t)
	adminsGoblin := server.createGoblin(t, server.adminToken(t))
	server.addMember(t, "ana@example.com", "Ana")
	anaToken := server.accessToken(t, "ana@example.com", memberPassword)

	response := server.doAs(t, anaToken, http.MethodPut, "/api/v1/miniatures/"+adminsGoblin.ID,
		`{"name":"Mine now","creatureType":"humanoid","size":"small","version":1}`)

	assertProblem(t, response, http.StatusForbidden, "You can only change your own miniatures.")
	got := decode[miniatureBody](t, server.doAs(t, anaToken, http.MethodGet, "/api/v1/miniatures/"+adminsGoblin.ID, ""))
	if got.Name != "Goblin" || got.CanChange {
		t.Errorf("name %q, canChange %v; want Goblin unchanged and canChange false for Ana", got.Name, got.CanChange)
	}
}

func TestCard5_AcceptanceCriterion3_TheSecondSaveGetsTheConflictMessage(t *testing.T) {
	server := newTestServer(t)
	token := server.adminToken(t)
	goblin := server.createGoblin(t, token)
	save := `{"name":"Goblin Boss","creatureType":"humanoid","size":"small","version":1}`

	if first := server.doAs(t, token, http.MethodPut, "/api/v1/miniatures/"+goblin.ID, save); first.StatusCode != http.StatusOK {
		t.Fatalf("first save: status %d", first.StatusCode)
	}
	second := server.doAs(t, token, http.MethodPut, "/api/v1/miniatures/"+goblin.ID, save)

	assertProblem(t, second, http.StatusConflict, "Someone changed this miniature while you were editing. Reload to see their changes.")
}

func TestCard5_DeleteThenTheMiniatureNoLongerExists(t *testing.T) {
	server := newTestServer(t)
	token := server.adminToken(t)
	goblin := server.createGoblin(t, token)

	if response := server.doAs(t, token, http.MethodDelete, "/api/v1/miniatures/"+goblin.ID, ""); response.StatusCode != http.StatusNoContent {
		t.Fatalf("delete: status %d, want 204", response.StatusCode)
	}

	for _, id := range []string{goblin.ID, "not-an-id"} {
		assertProblem(t, server.doAs(t, token, http.MethodGet, "/api/v1/miniatures/"+id, ""), http.StatusNotFound, "This miniature no longer exists.")
	}
}

func TestCard4_Rule4_OwnerOptionsListActiveUsers(t *testing.T) {
	server := newTestServer(t)
	server.addMember(t, "ana@example.com", "Ana")

	response := server.doAs(t, server.adminToken(t), http.MethodGet, "/api/v1/users/options", "")

	body := decode[struct {
		Items []struct {
			ID          string `json:"id"`
			DisplayName string `json:"displayName"`
		} `json:"items"`
	}](t, response)
	if len(body.Items) != 2 || body.Items[0].DisplayName != "Ana" || body.Items[1].DisplayName != "Mateus" || body.Items[0].ID == "" {
		t.Errorf("items = %+v, want Ana then Mateus with ids", body.Items)
	}
}
