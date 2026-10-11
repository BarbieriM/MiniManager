// Package auth issues and verifies JWT access tokens and hashes passwords and tokens. It holds no business rules.
package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// argon2id settings from RFC 9106's second recommended option: 3 passes over 64 MiB with 4 lanes.
const (
	argonTime    = 3
	argonMemory  = 64 * 1024
	argonThreads = 4
	argonKeyLen  = 32
	argonSaltLen = 16
)

var encoding = base64.RawStdEncoding

// HashPassword returns an argon2id hash in the standard PHC string format, salt and settings included.
func HashPassword(password string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("read salt: %w", err)
	}
	key := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemory, argonTime, argonThreads, encoding.EncodeToString(salt), encoding.EncodeToString(key)), nil
}

// VerifyPassword reports whether password matches a hash made by HashPassword, comparing in constant time.
func VerifyPassword(password, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, errors.New("verify password: not an argon2id hash")
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false, errors.New("verify password: unsupported argon2 version")
	}
	var memory, time uint32
	var threads uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &threads); err != nil {
		return false, fmt.Errorf("verify password: read settings: %w", err)
	}
	salt, err := encoding.DecodeString(parts[4])
	if err != nil {
		return false, fmt.Errorf("verify password: decode salt: %w", err)
	}
	want, err := encoding.DecodeString(parts[5])
	if err != nil {
		return false, fmt.Errorf("verify password: decode key: %w", err)
	}
	got := argon2.IDKey([]byte(password), salt, time, memory, threads, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1, nil
}
