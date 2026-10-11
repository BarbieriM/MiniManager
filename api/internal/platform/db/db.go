// Package db opens the Postgres connection pool and checks that every migration has been applied.
// It never applies migrations: only `make migrate` does that (ADR 0002).
package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/BarbieriM/MiniManager/api/migrations"
)

// Open connects to databaseURL and checks the connection works.
func Open(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

// CheckMigrations returns an error naming every embedded migration the database has not applied. It only reads,
// which is why it skips goose's status methods: those would create goose's version table on a fresh database.
func CheckMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	sqlDB := stdlib.OpenDBFromPool(pool)
	defer sqlDB.Close()

	// The provider is used only to list the embedded files; none of its methods that touch the database are called.
	provider, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations.Files)
	if err != nil {
		return fmt.Errorf("list embedded migrations: %w", err)
	}

	applied, err := appliedVersions(ctx, pool)
	if err != nil {
		return err
	}

	var pending []string
	for _, source := range provider.ListSources() {
		if !applied[source.Version] {
			pending = append(pending, source.Path)
		}
	}
	if len(pending) > 0 {
		return fmt.Errorf("database has pending migrations, run `make migrate` after reviewing them: %s",
			strings.Join(pending, ", "))
	}
	return nil
}

// appliedVersions reads goose's version table. goose appends a row per up or down, so a version counts as
// applied when its latest row says so. A missing table means nothing has been applied yet.
func appliedVersions(ctx context.Context, pool *pgxpool.Pool) (map[int64]bool, error) {
	var tableExists bool
	if err := pool.QueryRow(ctx, "SELECT to_regclass('goose_db_version') IS NOT NULL").Scan(&tableExists); err != nil {
		return nil, fmt.Errorf("look for goose_db_version: %w", err)
	}
	applied := map[int64]bool{}
	if !tableExists {
		return applied, nil
	}

	rows, err := pool.Query(ctx, `
		SELECT DISTINCT ON (version_id) version_id, is_applied
		FROM goose_db_version
		ORDER BY version_id, id DESC`)
	if err != nil {
		return nil, fmt.Errorf("read goose_db_version: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var version int64
		var isApplied bool
		if err := rows.Scan(&version, &isApplied); err != nil {
			return nil, fmt.Errorf("scan goose_db_version: %w", err)
		}
		applied[version] = isApplied
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read goose_db_version: %w", err)
	}
	return applied, nil
}
