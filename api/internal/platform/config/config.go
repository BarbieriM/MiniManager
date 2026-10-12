// Package config loads settings from environment variables.
package config

import (
	"errors"
	"fmt"
	"net/url"
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
	// EmailFrom is the sender of invite and reset emails, such as "Mini Manager <minis@example.com>".
	EmailFrom string
	// AppBaseURL is where the web app runs, for the links in emails, such as https://minis.example.com.
	AppBaseURL string
	// Exactly one of ResendAPIKey (send through Resend) and EmailOutboxDir (write emails to files, for local
	// development) is set.
	ResendAPIKey   string
	EmailOutboxDir string
}

// Load reads the server settings through getenv (os.Getenv in main) and reports every problem at once.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		DatabaseURL:    getenv("DATABASE_URL"),
		JWTSecret:      []byte(getenv("JWT_SECRET")),
		Port:           getenv("PORT"),
		WebDir:         getenv("WEB_DIR"),
		EmailFrom:      getenv("EMAIL_FROM"),
		AppBaseURL:     getenv("APP_BASE_URL"),
		ResendAPIKey:   getenv("RESEND_API_KEY"),
		EmailOutboxDir: getenv("EMAIL_OUTBOX_DIR"),
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
	if cfg.EmailFrom == "" {
		problems = append(problems, errors.New("EMAIL_FROM is required"))
	}
	if baseURL, err := url.Parse(cfg.AppBaseURL); err != nil || (baseURL.Scheme != "http" && baseURL.Scheme != "https") || baseURL.Host == "" {
		problems = append(problems, errors.New("APP_BASE_URL is required, as an http or https URL such as http://localhost:5173"))
	}
	if (cfg.ResendAPIKey == "") == (cfg.EmailOutboxDir == "") {
		problems = append(problems, errors.New("set exactly one of RESEND_API_KEY or EMAIL_OUTBOX_DIR"))
	}
	if len(problems) > 0 {
		return Config{}, fmt.Errorf("invalid config: %w", errors.Join(problems...))
	}
	return cfg, nil
}
