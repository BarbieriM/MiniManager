// Package config loads settings from environment variables.
package config

import (
	"errors"
	"fmt"
)

// minJWTSecretBytes matches the HS256 key size: a shorter secret is easier to brute-force.
const minJWTSecretBytes = 32

// Config holds the server's settings.
type Config struct {
	DatabaseURL string
	JWTSecret   []byte
	Port        string
	// WebDir is the built SPA folder. Optional: empty in `make dev`, where Vite serves the SPA.
	WebDir string
}

// Load reads the server settings through getenv (os.Getenv in main) and reports every problem at once.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		DatabaseURL: getenv("DATABASE_URL"),
		JWTSecret:   []byte(getenv("JWT_SECRET")),
		Port:        getenv("PORT"),
		WebDir:      getenv("WEB_DIR"),
	}

	var problems []error
	if cfg.DatabaseURL == "" {
		problems = append(problems, errors.New("DATABASE_URL is required"))
	}
	switch {
	case len(cfg.JWTSecret) == 0:
		problems = append(problems, errors.New("JWT_SECRET is required"))
	case len(cfg.JWTSecret) < minJWTSecretBytes:
		problems = append(problems, fmt.Errorf("JWT_SECRET must be at least %d bytes", minJWTSecretBytes))
	}
	if cfg.Port == "" {
		problems = append(problems, errors.New("PORT is required"))
	}
	if len(problems) > 0 {
		return Config{}, fmt.Errorf("invalid config: %w", errors.Join(problems...))
	}
	return cfg, nil
}
