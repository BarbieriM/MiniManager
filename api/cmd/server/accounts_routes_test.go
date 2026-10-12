package main

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
)

// doWith sends a request with a Bearer access token (when given) and cookies.
func (s testServer) doWith(t *testing.T, accessToken, method, path, body string, cookies ...*http.Cookie) *http.Response {
	t.Helper()
	request := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader(body))
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	if accessToken != "" {
		request.Header.Set("Authorization", "Bearer "+accessToken)
	}
	for _, cookie := range cookies {
		request.AddCookie(cookie)
	}
	recorder := httptest.NewRecorder()
	s.handler.ServeHTTP(recorder, request)
	return recorder.Result()
}

type sentInviteBody struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	Link      string `json:"link"`
	EmailSent bool   `json:"emailSent"`
}

var inviteToken = regexp.MustCompile(`/invite/(\S+)$`)

func TestCard4_Rule8_AndCard1_AcceptanceCriterion4_MembersGet403FromEveryAdminEndpoint(t *testing.T) {
	server := newTestServer(t)
	server.addMember(t, "ana@example.com", "Ana")
	member := server.accessToken(t, "ana@example.com", memberPassword)
	someID := "0190c8a2-0000-7000-8000-000000000000"

	for _, request := range []struct{ method, path, body string }{
		{http.MethodGet, "/api/v1/admin/invites", ""},
		{http.MethodPost, "/api/v1/admin/invites", `{"email":"bea@example.com","role":"member"}`},
		{http.MethodPost, "/api/v1/admin/invites/" + someID + "/resend", ""},
		{http.MethodDelete, "/api/v1/admin/invites/" + someID, ""},
		{http.MethodGet, "/api/v1/admin/users", ""},
		{http.MethodPatch, "/api/v1/admin/users/" + someID, `{"active":false}`},
	} {
		response := server.doAs(t, member, request.method, request.path, request.body)
		if response.StatusCode != http.StatusForbidden {
			t.Errorf("%s %s: status %d, want 403", request.method, request.path, response.StatusCode)
		}
	}
}

func TestCard1_Rule6_AnInviteeChecksTheLinkAndAcceptingLogsThemIn(t *testing.T) {
	server := newTestServer(t)
	admin := server.adminToken(t)

	response := server.doAs(t, admin, http.MethodPost, "/api/v1/admin/invites", `{"email":"ana@example.com"}`)
	if response.StatusCode != http.StatusCreated {
		t.Fatalf("send invite: status %d", response.StatusCode)
	}
	sent := decode[sentInviteBody](t, response)
	if sent.Status != "pending" || sent.Role != "member" || !sent.EmailSent || sent.Email != "ana@example.com" {
		t.Errorf("sent = %+v, want a Pending Member invite that was emailed", sent)
	}
	token := inviteToken.FindStringSubmatch(sent.Link)[1]

	checked := server.do(t, http.MethodGet, "/api/v1/invites/"+token, "")
	if body := decode[struct {
		Email string `json:"email"`
	}](t, checked); checked.StatusCode != http.StatusOK || body.Email != "ana@example.com" {
		t.Fatalf("check: status %d, email %q", checked.StatusCode, body.Email)
	}

	accepted := server.do(t, http.MethodPost, "/api/v1/invites/"+token+"/accept", `{"displayName":"Ana","password":"a good password"}`)
	if accepted.StatusCode != http.StatusOK {
		t.Fatalf("accept: status %d", accepted.StatusCode)
	}
	refreshCookie(t, accepted)
	if session := decode[sessionBody](t, accepted); session.AccessToken == "" || session.User.DisplayName != "Ana" || session.User.Role != "member" {
		t.Errorf("session = %+v", session)
	}
}

func TestCard1_AcceptanceCriterion2_AnInvalidInviteLinkGets410WithTheCardMessage(t *testing.T) {
	server := newTestServer(t)

	response := server.do(t, http.MethodGet, "/api/v1/invites/not-a-real-token", "")

	assertProblem(t, response, http.StatusGone, "This invite is no longer valid. Ask the admin for a new one.")
}

func TestCard1_Rule2_InvitingARegisteredEmailIsAFieldError(t *testing.T) {
	server := newTestServer(t)

	response := server.doAs(t, server.adminToken(t), http.MethodPost, "/api/v1/admin/invites", `{"email":"`+adminEmail+`","role":"member"}`)

	problem := assertProblem(t, response, http.StatusBadRequest, "")
	if len(problem.Errors) != 1 || problem.Errors[0].Field != "email" {
		t.Errorf("errors = %+v, want one on email", problem.Errors)
	}
}

func TestCard2_Rule7_TheResetAnswerIsTheSameForKnownAndUnknownEmails(t *testing.T) {
	server := newTestServer(t)

	known := server.do(t, http.MethodPost, "/api/v1/auth/password-reset", `{"email":"`+adminEmail+`"}`)
	unknown := server.do(t, http.MethodPost, "/api/v1/auth/password-reset", `{"email":"nobody@example.com"}`)

	knownBody, _ := io.ReadAll(known.Body)
	unknownBody, _ := io.ReadAll(unknown.Body)
	if known.StatusCode != http.StatusAccepted || unknown.StatusCode != http.StatusAccepted || !bytes.Equal(knownBody, unknownBody) {
		t.Fatalf("known %d %s, unknown %d %s; want the same 202 answer", known.StatusCode, knownBody, unknown.StatusCode, unknownBody)
	}
	if !strings.Contains(string(knownBody), "If that email exists, we sent a link") {
		t.Errorf("body = %s, want the Card 2 message", knownBody)
	}
}

func TestCard2_AcceptanceCriterion4_ABadResetLinkGets410WithTheCardMessage(t *testing.T) {
	server := newTestServer(t)

	response := server.do(t, http.MethodPost, "/api/v1/auth/password-reset/confirm", `{"token":"not-a-real-token","password":"a brand new password"}`)

	assertProblem(t, response, http.StatusGone, "This reset link is invalid or expired.")
}

func TestCard3_Rule3_ChangingThePasswordKeepsThisSession(t *testing.T) {
	server := newTestServer(t)
	login := server.login(t)
	cookie := refreshCookie(t, login)
	accessToken := decode[sessionBody](t, login).AccessToken

	response := server.doWith(t, accessToken, http.MethodPost, "/api/v1/auth/password",
		`{"currentPassword":"`+adminPassword+`","newPassword":"a brand new password"}`, cookie)
	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("change password: status %d", response.StatusCode)
	}

	if refreshed := server.do(t, http.MethodPost, "/api/v1/auth/refresh", "", cookie); refreshed.StatusCode != http.StatusOK {
		t.Fatalf("refresh this Session: status %d, want 200", refreshed.StatusCode)
	}
}

func TestCard3_Rule2_AWrongCurrentPasswordIsAFieldError(t *testing.T) {
	server := newTestServer(t)

	response := server.doAs(t, server.adminToken(t), http.MethodPost, "/api/v1/auth/password",
		`{"currentPassword":"wrong password","newPassword":"a brand new password"}`)

	problem := assertProblem(t, response, http.StatusBadRequest, "")
	if len(problem.Errors) != 1 || problem.Errors[0].Field != "currentPassword" {
		t.Errorf("errors = %+v, want one on currentPassword", problem.Errors)
	}
}

type meBody struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

func TestCard3_Rule1_AUserReadsAndRenamesThemself(t *testing.T) {
	server := newTestServer(t)
	admin := server.adminToken(t)

	me := decode[meBody](t, server.doAs(t, admin, http.MethodGet, "/api/v1/me", ""))
	if me.Email != adminEmail || me.DisplayName != "Mateus" || me.Role != "admin" {
		t.Fatalf("me = %+v", me)
	}
	response := server.doAs(t, admin, http.MethodPatch, "/api/v1/me", `{"displayName":"Mateus B"}`)
	if renamed := decode[meBody](t, response); response.StatusCode != http.StatusOK || renamed.DisplayName != "Mateus B" {
		t.Fatalf("rename: status %d, name %q", response.StatusCode, renamed.DisplayName)
	}
}

func TestCard4_Rule6_DemotingTheLastAdminGets409WithTheCardMessage(t *testing.T) {
	server := newTestServer(t)
	admin := server.adminToken(t)
	me := decode[meBody](t, server.doAs(t, admin, http.MethodGet, "/api/v1/me", ""))

	response := server.doAs(t, admin, http.MethodPatch, "/api/v1/admin/users/"+me.ID, `{"role":"member"}`)

	assertProblem(t, response, http.StatusConflict, "There must be at least one admin.")
}

func TestCard4_DeactivatingYourselfGets409(t *testing.T) {
	server := newTestServer(t)
	admin := server.adminToken(t)
	me := decode[meBody](t, server.doAs(t, admin, http.MethodGet, "/api/v1/me", ""))

	response := server.doAs(t, admin, http.MethodPatch, "/api/v1/admin/users/"+me.ID, `{"active":false}`)

	assertProblem(t, response, http.StatusConflict, "Ask another admin to deactivate you.")
}

func TestCard4_TheMembersListUsesTheEnvelope(t *testing.T) {
	server := newTestServer(t)
	server.addMember(t, "ana@example.com", "Ana")

	response := server.doAs(t, server.adminToken(t), http.MethodGet, "/api/v1/admin/users", "")

	body := decode[struct {
		Items []struct {
			DisplayName string `json:"displayName"`
			Email       string `json:"email"`
			Role        string `json:"role"`
			Active      bool   `json:"active"`
		} `json:"items"`
		Total int `json:"total"`
	}](t, response)
	if response.StatusCode != http.StatusOK || body.Total != 2 || body.Items[0].DisplayName != "Ana" || !body.Items[0].Active {
		t.Fatalf("status %d, body %+v", response.StatusCode, body)
	}
}
