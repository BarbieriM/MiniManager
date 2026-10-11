// Command seed creates the first Admin from environment variables (Card 1 rule 7). Running it again does nothing.
// It refuses to run while migrations are pending and never applies them.
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/BarbieriM/MiniManager/api/internal/features/users"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db"
)

func main() {
	if err := run(context.Background(), os.Getenv); err != nil {
		log.Fatalf("seed: %v", err)
	}
}

// run reads its settings through getenv (os.Getenv in main), so tests can pass their own.
func run(ctx context.Context, getenv func(string) string) error {
	databaseURL := getenv("DATABASE_URL")
	if databaseURL == "" {
		return errors.New("DATABASE_URL is required")
	}
	admin := users.NewAdmin{
		Email:       getenv("SEED_ADMIN_EMAIL"),
		Password:    getenv("SEED_ADMIN_PASSWORD"),
		DisplayName: getenv("SEED_ADMIN_NAME"),
	}

	pool, err := db.Open(ctx, databaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := db.CheckMigrations(ctx, pool); err != nil {
		return err
	}

	created, err := users.NewService(pool).CreateAdmin(ctx, admin)
	if err != nil {
		return fmt.Errorf("create admin (check SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME): %w", err)
	}
	// Neither the password nor the email is logged.
	if created {
		log.Println("seed: Admin created")
	} else {
		log.Println("seed: a User with SEED_ADMIN_EMAIL already exists; nothing changed")
	}
	return nil
}
