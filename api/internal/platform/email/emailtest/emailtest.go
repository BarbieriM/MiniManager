// Package emailtest gives tests a Sender that records messages instead of sending them.
package emailtest

import (
	"context"
	"errors"
	"sync"

	"github.com/BarbieriM/MiniManager/api/internal/platform/email"
)

// ErrSendFailed is what a failing Recorder returns.
var ErrSendFailed = errors.New("email service is down")

// Recorder keeps every sent Message. With Fail set, it records nothing and returns ErrSendFailed.
type Recorder struct {
	mu   sync.Mutex
	sent []email.Message
	Fail bool
}

func (r *Recorder) Send(_ context.Context, message email.Message) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.Fail {
		return ErrSendFailed
	}
	r.sent = append(r.sent, message)
	return nil
}

// Sent returns the messages sent so far, oldest first.
func (r *Recorder) Sent() []email.Message {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]email.Message(nil), r.sent...)
}
