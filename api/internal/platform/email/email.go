// Package email sends the app's plain-text emails (invites and password resets): through the Resend HTTP API, or,
// in local development, into an outbox folder of files.
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

// New returns the Resend sender when apiKey is set, otherwise an Outbox writing to outboxDir.
func New(apiKey, outboxDir, from string) Sender {
	if apiKey != "" {
		return &Resend{APIKey: apiKey, From: from, Endpoint: resendEndpoint, Client: http.DefaultClient}
	}
	return &Outbox{Dir: outboxDir, From: from}
}
