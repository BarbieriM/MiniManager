package email

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

var invite = Message{To: "ana@example.com", Subject: "You're invited to Mini Manager", Body: "Open http://localhost/invite/abc"}

func TestResend_PostsTheMessageWithTheAPIKey(t *testing.T) {
	var got struct {
		From    string   `json:"from"`
		To      []string `json:"to"`
		Subject string   `json:"subject"`
		Text    string   `json:"text"`
	}
	var authorization string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authorization = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
			t.Errorf("decode: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	sender := &Resend{APIKey: "re_test", From: "Mini Manager <minis@example.com>", Endpoint: server.URL, Client: server.Client()}
	if err := sender.Send(t.Context(), invite); err != nil {
		t.Fatalf("Send: %v", err)
	}

	if authorization != "Bearer re_test" {
		t.Errorf("Authorization = %q", authorization)
	}
	if got.From != "Mini Manager <minis@example.com>" || len(got.To) != 1 || got.To[0] != invite.To || got.Subject != invite.Subject || got.Text != invite.Body {
		t.Errorf("body = %+v", got)
	}
}

func TestResend_ReportsARefusedMessage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	sender := &Resend{APIKey: "re_test", From: "minis@example.com", Endpoint: server.URL, Client: server.Client()}
	err := sender.Send(t.Context(), invite)

	if err == nil || !strings.Contains(err.Error(), "403") {
		t.Errorf("Send error = %v, want one with the status", err)
	}
	if strings.Contains(err.Error(), invite.To) {
		t.Errorf("error %q names the recipient; emails are never logged in full", err)
	}
}

func TestOutbox_WritesEachMessageToItsOwnFile(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "outbox")
	outbox := &Outbox{Dir: dir, From: "minis@example.com"}

	for range 2 {
		if err := outbox.Send(t.Context(), invite); err != nil {
			t.Fatalf("Send: %v", err)
		}
	}

	files, err := os.ReadDir(dir)
	if err != nil || len(files) != 2 {
		t.Fatalf("outbox has %d files (%v), want 2", len(files), err)
	}
	content, err := os.ReadFile(filepath.Join(dir, files[0].Name()))
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	for _, want := range []string{"To: ana@example.com", "Subject: You're invited to Mini Manager", "http://localhost/invite/abc"} {
		if !strings.Contains(string(content), want) {
			t.Errorf("file lacks %q:\n%s", want, content)
		}
	}
}

func TestBrevo_PostsTheMessageWithTheAPIKey(t *testing.T) {
	var got struct {
		Sender      struct{ Name, Email string } `json:"sender"`
		To          []struct{ Email string }     `json:"to"`
		Subject     string                       `json:"subject"`
		TextContent string                       `json:"textContent"`
	}
	var apiKey, path string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey, path = r.Header.Get("api-key"), r.URL.Path
		if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
			t.Errorf("decode: %v", err)
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	sender := &Brevo{APIKey: "xkeysib-test", From: "Mini Manager <mateus@gmail.com>", Endpoint: server.URL + "/v3/smtp/email", Client: server.Client()}
	if err := sender.Send(t.Context(), invite); err != nil {
		t.Fatalf("Send: %v", err)
	}

	if apiKey != "xkeysib-test" || path != "/v3/smtp/email" {
		t.Errorf("api-key %q, path %q", apiKey, path)
	}
	if got.Sender.Name != "Mini Manager" || got.Sender.Email != "mateus@gmail.com" || len(got.To) != 1 || got.To[0].Email != invite.To ||
		got.Subject != invite.Subject || got.TextContent != invite.Body {
		t.Errorf("body = %+v", got)
	}
}

func TestBrevo_ReportsARefusedMessageByStatusOnly(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	sender := &Brevo{APIKey: "xkeysib-test", From: "mateus@gmail.com", Endpoint: server.URL, Client: server.Client()}
	err := sender.Send(t.Context(), invite)

	if err == nil || !strings.Contains(err.Error(), "401") || strings.Contains(err.Error(), invite.To) || strings.Contains(err.Error(), "xkeysib") {
		t.Errorf("Send error = %v, want one naming only the status", err)
	}
}

func TestNew_PicksTheSenderFromTheSettings(t *testing.T) {
	if _, ok := New(Settings{BrevoAPIKey: "b", From: "a@b.c"}).(*Brevo); !ok {
		t.Error("a Brevo key does not give the Brevo sender")
	}
	if _, ok := New(Settings{ResendAPIKey: "r", From: "a@b.c"}).(*Resend); !ok {
		t.Error("a Resend key does not give the Resend sender")
	}
	if _, ok := New(Settings{OutboxDir: "tmp/outbox", From: "a@b.c"}).(*Outbox); !ok {
		t.Error("an outbox folder does not give the outbox")
	}
}
