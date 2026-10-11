// Package migrations embeds the goose SQL files so the server binary can check the schema version.
package migrations

import "embed"

// Files holds every migration in this folder.
//
//go:embed *.sql
var Files embed.FS
