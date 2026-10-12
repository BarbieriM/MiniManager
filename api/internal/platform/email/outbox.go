package email

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

// Outbox writes each email to its own text file in Dir instead of sending it, so invites and resets can be tried
// locally without a Resend key. Open the newest file to follow its link.
type Outbox struct {
	Dir  string
	From string
}

func (o *Outbox) Send(_ context.Context, message Message) error {
	if err := os.MkdirAll(o.Dir, 0o700); err != nil {
		return fmt.Errorf("create outbox: %w", err)
	}
	// A time-ordered uuid v7 makes names unique and sorts them oldest first.
	id, err := uuid.NewV7()
	if err != nil {
		return fmt.Errorf("new email id: %w", err)
	}
	content := fmt.Sprintf("From: %s\nTo: %s\nDate: %s\nSubject: %s\n\n%s\n",
		o.From, message.To, time.Now().Format(time.RFC1123Z), message.Subject, message.Body)
	if err := os.WriteFile(filepath.Join(o.Dir, id.String()+".txt"), []byte(content), 0o600); err != nil {
		return fmt.Errorf("write email to outbox: %w", err)
	}
	return nil
}
