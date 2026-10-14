package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
)

// brevoEndpoint is Brevo's send-transactional-email API.
const brevoEndpoint = "https://api.brevo.com/v3/smtp/email"

// Brevo sends through Brevo's transactional email API with plain net/http (ADR 0006). From must be a sender
// address verified in the Brevo account, such as "Mini Manager <someone@gmail.com>".
type Brevo struct {
	APIKey   string
	From     string
	Endpoint string
	Client   *http.Client
}

type brevoAddress struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}

type brevoRequest struct {
	Sender      brevoAddress   `json:"sender"`
	To          []brevoAddress `json:"to"`
	Subject     string         `json:"subject"`
	TextContent string         `json:"textContent"`
}

func (b *Brevo) Send(ctx context.Context, message Message) error {
	sender, err := mail.ParseAddress(b.From)
	if err != nil {
		return fmt.Errorf("read EMAIL_FROM: %w", err)
	}
	body, err := json.Marshal(brevoRequest{
		Sender:      brevoAddress{Name: sender.Name, Email: sender.Address},
		To:          []brevoAddress{{Email: message.To}},
		Subject:     message.Subject,
		TextContent: message.Body,
	})
	if err != nil {
		return fmt.Errorf("encode email: %w", err)
	}
	ctx, cancel := context.WithTimeout(ctx, sendTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, b.Endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build email request: %w", err)
	}
	request.Header.Set("api-key", b.APIKey)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json")
	response, err := b.Client.Do(request)
	if err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	defer response.Body.Close()
	return checkStatus("brevo", response)
}
