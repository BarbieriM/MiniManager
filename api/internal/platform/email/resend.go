package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// resendEndpoint is Resend's send-email API.
const resendEndpoint = "https://api.resend.com/emails"

// sendTimeout keeps a slow email service from holding a request open.
const sendTimeout = 10 * time.Second

// Resend sends through the Resend API with plain net/http (no SDK, docs/plan.md).
type Resend struct {
	APIKey   string
	From     string
	Endpoint string
	Client   *http.Client
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Text    string   `json:"text"`
}

func (r *Resend) Send(ctx context.Context, message Message) error {
	body, err := json.Marshal(resendRequest{From: r.From, To: []string{message.To}, Subject: message.Subject, Text: message.Body})
	if err != nil {
		return fmt.Errorf("encode email: %w", err)
	}
	ctx, cancel := context.WithTimeout(ctx, sendTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, r.Endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build email request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+r.APIKey)
	request.Header.Set("Content-Type", "application/json")
	response, err := r.Client.Do(request)
	if err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	defer response.Body.Close()
	return checkStatus("resend", response)
}

// checkStatus turns a non-2xx response from service into an error that names only the status.
func checkStatus(service string, response *http.Response) error {
	if response.StatusCode < 200 || response.StatusCode > 299 {
		return fmt.Errorf("send email: %s answered %d", service, response.StatusCode)
	}
	return nil
}
