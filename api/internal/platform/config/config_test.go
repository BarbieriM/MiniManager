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
	got, err := Load(envFrom(withEmail(map[string]string{
		"DATABASE_URL": "postgres://localhost/mini",
		"JWT_SECRET":   validSecret,
		"PORT":         "8080",
		"WEB_DIR":      "/app/web",
	})))
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
	_, err := Load(envFrom(withEmail(map[string]string{
		"DATABASE_URL": "postgres://localhost/mini",
		"JWT_SECRET":   validSecret[:31],
		"PORT":         "8080",
	})))
	if err == nil || !strings.Contains(err.Error(), "JWT_SECRET") {
		t.Fatalf("Load error = %v, want one naming JWT_SECRET", err)
	}
}

func TestLoad_ReportsEveryMissingVariable(t *testing.T) {
	_, err := Load(envFrom(map[string]string{}))
	if err == nil {
		t.Fatal("Load returned no error for an empty environment")
	}
	for _, name := range []string{"DATABASE_URL", "JWT_SECRET", "PORT", "EMAIL_FROM", "APP_BASE_URL", "BREVO_API_KEY, RESEND_API_KEY or EMAIL_OUTBOX_DIR"} {
		if !strings.Contains(err.Error(), name) {
			t.Errorf("error %q does not name %s", err, name)
		}
	}
}

// withEmail adds valid email settings (the local outbox) to values.
func withEmail(values map[string]string) map[string]string {
	values["EMAIL_FROM"] = "Mini Manager <minis@example.com>"
	values["APP_BASE_URL"] = "http://localhost:5173"
	values["EMAIL_OUTBOX_DIR"] = "tmp/outbox"
	return values
}

func TestLoad_ReadsTheEmailSettings(t *testing.T) {
	got, err := Load(envFrom(withEmail(map[string]string{
		"DATABASE_URL": "postgres://localhost/mini", "JWT_SECRET": validSecret, "PORT": "8080",
	})))
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if got.Email.From != "Mini Manager <minis@example.com>" || got.AppBaseURL != "http://localhost:5173" || got.Email.OutboxDir != "tmp/outbox" {
		t.Errorf("email settings = %+v, base URL %q", got.Email, got.AppBaseURL)
	}
}

func TestLoad_RefusesBothResendAndTheOutbox(t *testing.T) {
	values := withEmail(map[string]string{"DATABASE_URL": "postgres://localhost/mini", "JWT_SECRET": validSecret, "PORT": "8080"})
	values["RESEND_API_KEY"] = "re_test"
	_, err := Load(envFrom(values))
	if err == nil || !strings.Contains(err.Error(), "BREVO_API_KEY, RESEND_API_KEY or EMAIL_OUTBOX_DIR") {
		t.Fatalf("Load error = %v, want one about choosing one email sender", err)
	}
}

func TestLoad_RejectsABaseURLWithoutScheme(t *testing.T) {
	values := withEmail(map[string]string{"DATABASE_URL": "postgres://localhost/mini", "JWT_SECRET": validSecret, "PORT": "8080"})
	values["APP_BASE_URL"] = "localhost:5173"
	_, err := Load(envFrom(values))
	if err == nil || !strings.Contains(err.Error(), "APP_BASE_URL") {
		t.Fatalf("Load error = %v, want one naming APP_BASE_URL", err)
	}
}

func TestLoad_PhotosAreOffWithoutCloudinaryAndOnWithAllThreeSettings(t *testing.T) {
	values := withEmail(map[string]string{"DATABASE_URL": "postgres://localhost/mini", "JWT_SECRET": validSecret, "PORT": "8080"})
	off, err := Load(envFrom(values))
	if err != nil || off.PhotosEnabled() {
		t.Fatalf("without Cloudinary: err %v, photos enabled %v; want no error and photos off", err, off.PhotosEnabled())
	}

	values["CLOUDINARY_CLOUD_NAME"], values["CLOUDINARY_API_KEY"], values["CLOUDINARY_API_SECRET"] = "minis", "key", "secret"
	on, err := Load(envFrom(values))
	if err != nil || !on.PhotosEnabled() {
		t.Fatalf("with Cloudinary: err %v, photos enabled %v; want photos on", err, on.PhotosEnabled())
	}
}

func TestLoad_RefusesHalfACloudinaryAccount(t *testing.T) {
	values := withEmail(map[string]string{"DATABASE_URL": "postgres://localhost/mini", "JWT_SECRET": validSecret, "PORT": "8080"})
	values["CLOUDINARY_CLOUD_NAME"] = "minis"

	_, err := Load(envFrom(values))

	if err == nil || !strings.Contains(err.Error(), "CLOUDINARY_API_SECRET") {
		t.Fatalf("Load error = %v, want one naming the Cloudinary settings", err)
	}
}

func TestLoad_ProductionSendsThroughBrevoAlone(t *testing.T) {
	values := withEmail(map[string]string{"DATABASE_URL": "postgres://localhost/mini", "JWT_SECRET": validSecret, "PORT": "8080"})
	values["EMAIL_OUTBOX_DIR"] = ""
	values["BREVO_API_KEY"] = "xkeysib-test"

	got, err := Load(envFrom(values))

	if err != nil || got.Email.BrevoAPIKey != "xkeysib-test" {
		t.Fatalf("Load = %+v, %v; want the Brevo key and no error", got.Email, err)
	}
}

func TestLoad_ReadsTheOptionalCloudinaryFolder(t *testing.T) {
	values := withEmail(map[string]string{"DATABASE_URL": "postgres://localhost/mini", "JWT_SECRET": validSecret, "PORT": "8080"})
	values["CLOUDINARY_CLOUD_NAME"], values["CLOUDINARY_API_KEY"], values["CLOUDINARY_API_SECRET"] = "minis", "key", "secret"
	values["CLOUDINARY_FOLDER"] = "prod"

	got, err := Load(envFrom(values))

	if err != nil || got.Cloudinary.Folder != "prod" {
		t.Fatalf("Load = %+v, %v; want folder prod", got.Cloudinary, err)
	}
}

func TestLoad_RefusesAnEmailFromThatIsNotAnAddress(t *testing.T) {
	values := withEmail(map[string]string{"DATABASE_URL": "postgres://localhost/mini", "JWT_SECRET": validSecret, "PORT": "8080"})
	values["EMAIL_FROM"] = "Mini Manager"

	_, err := Load(envFrom(values))

	if err == nil || !strings.Contains(err.Error(), "EMAIL_FROM") {
		t.Fatalf("Load error = %v, want one naming EMAIL_FROM", err)
	}
}
