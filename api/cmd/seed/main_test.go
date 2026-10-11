package main

import (
	"strings"
	"testing"

	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
)

func TestSeedRefusesToRunWhileMigrationsArePending(t *testing.T) {
	env := map[string]string{
		"DATABASE_URL":        dbtest.NewEmptyDatabase(t),
		"SEED_ADMIN_EMAIL":    "mateus@example.com",
		"SEED_ADMIN_PASSWORD": "correct horse",
		"SEED_ADMIN_NAME":     "Mateus",
	}

	err := run(t.Context(), func(key string) string { return env[key] })

	if err == nil || !strings.Contains(err.Error(), "pending migrations") {
		t.Fatalf("run error = %v, want one about pending migrations", err)
	}
}
