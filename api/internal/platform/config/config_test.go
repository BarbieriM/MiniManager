package config

import (
	"strings"
	"testing"
)

const validSecret = "0123456789abcdef0123456789abcdef"

func envFrom(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoad_ValidEnvironment(t *testing.T) {
	got, err := Load(envFrom(map[string]string{
		"DATABASE_URL": "postgres://localhost/mini",
		"JWT_SECRET":   validSecret,
		"PORT":         "8080",
		"WEB_DIR":      "/app/web",
	}))
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if got.WebDir != "/app/web" {
		t.Errorf("WebDir = %q", got.WebDir)
	}
	if got.DatabaseURL != "postgres://localhost/mini" {
		t.Errorf("DatabaseURL = %q", got.DatabaseURL)
	}
	if string(got.JWTSecret) != validSecret {
		t.Errorf("JWTSecret = %q", got.JWTSecret)
	}
	if got.Port != "8080" {
		t.Errorf("Port = %q", got.Port)
	}
}

func TestLoad_RejectsJWTSecretShorterThan32Bytes(t *testing.T) {
	_, err := Load(envFrom(map[string]string{
		"DATABASE_URL": "postgres://localhost/mini",
		"JWT_SECRET":   validSecret[:31],
		"PORT":         "8080",
	}))
	if err == nil || !strings.Contains(err.Error(), "JWT_SECRET") {
		t.Fatalf("Load error = %v, want one naming JWT_SECRET", err)
	}
}

func TestLoad_ReportsEveryMissingVariable(t *testing.T) {
	_, err := Load(envFrom(map[string]string{}))
	if err == nil {
		t.Fatal("Load returned no error for an empty environment")
	}
	for _, name := range []string{"DATABASE_URL", "JWT_SECRET", "PORT"} {
		if !strings.Contains(err.Error(), name) {
			t.Errorf("error %q does not name %s", err, name)
		}
	}
}
