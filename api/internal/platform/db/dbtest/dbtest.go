// Package dbtest gives tests their own Postgres database inside one shared testcontainers Postgres 18.
// It is the only place outside `make migrate` that applies migrations, and only to throwaway databases.
package dbtest

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/testcontainers/testcontainers-go/modules/postgres"

	"github.com/BarbieriM/MiniManager/api/migrations"
)

var (
	startOnce    sync.Once
	containerURL string
	startErr     error
	databaseNum  atomic.Int64
)

// NewEmptyDatabase creates a database with no migrations applied and returns its connection URL.
func NewEmptyDatabase(t *testing.T) string {
	t.Helper()
	ctx := t.Context()

	startOnce.Do(func() { containerURL, startErr = startContainer(context.Background()) })
	if startErr != nil {
		t.Fatalf("start postgres container: %v", startErr)
	}

	admin, err := pgxpool.New(ctx, containerURL)
	if err != nil {
		t.Fatalf("connect to postgres container: %v", err)
	}
	defer admin.Close()

	name := fmt.Sprintf("test_%d", databaseNum.Add(1))
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name); err != nil {
		t.Fatalf("create database %s: %v", name, err)
	}

	databaseURL, err := url.Parse(containerURL)
	if err != nil {
		t.Fatalf("parse container url: %v", err)
	}
	databaseURL.Path = "/" + name
	return databaseURL.String()
}

// NewDatabase creates a database with every migration applied and returns a pool that closes when the test ends.
func NewDatabase(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := t.Context()

	pool, err := pgxpool.New(ctx, NewEmptyDatabase(t))
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)

	sqlDB := stdlib.OpenDBFromPool(pool)
	defer sqlDB.Close()
	if err := migrateUp(ctx, sqlDB); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}
	return pool
}

func migrateUp(ctx context.Context, sqlDB *sql.DB) error {
	provider, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations.Files)
	if err != nil {
		return fmt.Errorf("create goose provider: %w", err)
	}
	if _, err := provider.Up(ctx); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}
	return nil
}

// startContainer runs for the whole test binary; testcontainers' reaper removes the container afterwards.
func startContainer(ctx context.Context) (string, error) {
	container, err := postgres.Run(ctx, "postgres:18",
		postgres.WithDatabase("mini_manager"),
		postgres.WithUsername("mini"),
		postgres.WithPassword("mini"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		return "", fmt.Errorf("run postgres:18: %w", err)
	}
	connectionURL, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		return "", fmt.Errorf("container connection string: %w", err)
	}
	return connectionURL, nil
}
