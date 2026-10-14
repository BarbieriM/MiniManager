// Package config loads settings from environment variables.
package config

import (
	"errors"
	"fmt"
	"net/mail"
	"net/url"

	"github.com/BarbieriM/MiniManager/api/internal/platform/email"
	"github.com/BarbieriM/MiniManager/api/internal/platform/images"
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
	// Email chooses how invite and reset emails are sent: From, plus exactly one of a Brevo key (production, ADR
	// 0006), a Resend key, or an outbox folder (local development).
	Email email.Settings
	// AppBaseURL is where the web app runs, for the links in emails, such as https://minis.example.com.
	AppBaseURL string
	// Cloudinary is the account for Photos (Card 7, ADR 0005): all three settings, or none, which leaves Photos off.
	Cloudinary images.Account
}

// PhotosEnabled reports whether a Cloudinary account is configured.
func (c Config) PhotosEnabled() bool {
	return c.Cloudinary.CloudName != ""
}

// Load reads the server settings through getenv (os.Getenv in main) and reports every problem at once.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		DatabaseURL: getenv("DATABASE_URL"),
		JWTSecret:   []byte(getenv("JWT_SECRET")),
		Port:        getenv("PORT"),
		WebDir:      getenv("WEB_DIR"),
		Email: email.Settings{
			From:         getenv("EMAIL_FROM"),
			BrevoAPIKey:  getenv("BREVO_API_KEY"),
			ResendAPIKey: getenv("RESEND_API_KEY"),
			OutboxDir:    getenv("EMAIL_OUTBOX_DIR"),
		},
		AppBaseURL: getenv("APP_BASE_URL"),

		Cloudinary: images.Account{
			CloudName: getenv("CLOUDINARY_CLOUD_NAME"),
			APIKey:    getenv("CLOUDINARY_API_KEY"),
			APISecret: getenv("CLOUDINARY_API_SECRET"),
			Folder:    getenv("CLOUDINARY_FOLDER"),
		},
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
	// Checked here, not when the first email goes out, so a typo stops the server instead of every invite.
	if _, err := mail.ParseAddress(cfg.Email.From); err != nil {
		problems = append(problems, errors.New("EMAIL_FROM is required, as an address such as Mini Manager <you@example.com>"))
	}
	if baseURL, err := url.Parse(cfg.AppBaseURL); err != nil || (baseURL.Scheme != "http" && baseURL.Scheme != "https") || baseURL.Host == "" {
		problems = append(problems, errors.New("APP_BASE_URL is required, as an http or https URL such as http://localhost:5173"))
	}
	if countSet(cfg.Email.BrevoAPIKey, cfg.Email.ResendAPIKey, cfg.Email.OutboxDir) != 1 {
		problems = append(problems, errors.New("set exactly one of BREVO_API_KEY, RESEND_API_KEY or EMAIL_OUTBOX_DIR"))
	}
	if set := countSet(cfg.Cloudinary.CloudName, cfg.Cloudinary.APIKey, cfg.Cloudinary.APISecret); set != 0 && set != 3 {
		problems = append(problems, errors.New("set all of CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or none to leave photos off"))
	}
	if len(problems) > 0 {
		return Config{}, fmt.Errorf("invalid config: %w", errors.Join(problems...))
	}
	return cfg, nil
}

// countSet counts the values that are not empty.
func countSet(values ...string) int {
	set := 0
	for _, value := range values {
		if value != "" {
			set++
		}
	}
	return set
}
