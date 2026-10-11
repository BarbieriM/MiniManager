package db_test

import (
	"strings"
	"testing"

	"github.com/BarbieriM/MiniManager/api/internal/platform/db"
	"github.com/BarbieriM/MiniManager/api/internal/platform/db/dbtest"
)

func TestCheckMigrations_RefusesWhenMigrationsArePending(t *testing.T) {
	pool, err := db.Open(t.Context(), dbtest.NewEmptyDatabase(t))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer pool.Close()

	err = db.CheckMigrations(t.Context(), pool)
	if err == nil {
		t.Fatal("CheckMigrations returned nil for a database with no migrations applied")
	}
	if !strings.Contains(err.Error(), "00001_users_and_sessions.sql") {
		t.Errorf("error %q does not name the pending migration", err)
	}
}

func TestCheckMigrations_DoesNotWriteToTheDatabase(t *testing.T) {
	pool, err := db.Open(t.Context(), dbtest.NewEmptyDatabase(t))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer pool.Close()

	_ = db.CheckMigrations(t.Context(), pool)

	var tables int
	err = pool.QueryRow(t.Context(),
		"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tables)
	if err != nil {
		t.Fatalf("count tables: %v", err)
	}
	if tables != 0 {
		t.Errorf("CheckMigrations created %d table(s) in an empty database", tables)
	}
}

func TestCheckMigrations_PassesWhenUpToDate(t *testing.T) {
	pool := dbtest.NewDatabase(t)

	if err := db.CheckMigrations(t.Context(), pool); err != nil {
		t.Fatalf("CheckMigrations: %v", err)
	}
}
