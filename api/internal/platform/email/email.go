// Package email sends the app's plain-text emails (invites and password resets): through Brevo's HTTP API in
// production (ADR 0006), through Resend's, or, in local development, into an outbox folder of files.
package email

import (
	"context"
	"net/http"
)

// Message is one plain-text email.
type Message struct {
	To      string
	Subject string
	Body    string
}

// Sender sends a Message. Errors never include the recipient or the body, which may hold a token.
type Sender interface {
	Send(ctx context.Context, message Message) error
}

// Settings choose how email is sent. From is the sender; exactly one of the other three is set, which config
// checks at start-up.
type Settings struct {
	From         string
	BrevoAPIKey  string
	ResendAPIKey string
	OutboxDir    string
}

// New returns the sender the settings choose: Brevo, Resend, or the outbox.
func New(settings Settings) Sender {
	switch {
	case settings.BrevoAPIKey != "":
		return &Brevo{APIKey: settings.BrevoAPIKey, From: settings.From, Endpoint: brevoEndpoint, Client: http.DefaultClient}
	case settings.ResendAPIKey != "":
		return &Resend{APIKey: settings.ResendAPIKey, From: settings.From, Endpoint: resendEndpoint, Client: http.DefaultClient}
	default:
		return &Outbox{Dir: settings.OutboxDir, From: settings.From}
	}
}
