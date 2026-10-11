package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	// AccessTokenTTL is how long an access token is valid (Card 2 rule 4).
	AccessTokenTTL = 15 * time.Minute
	// clockSkew is tolerated on expiry checks (Card 2 edge case: allow 30 seconds).
	clockSkew = 30 * time.Second
)

// ErrInvalidAccessToken means a token is malformed, badly signed or expired.
var ErrInvalidAccessToken = errors.New("invalid access token")

// AccessTokens issues and verifies HS256 JWTs that carry only the user id.
type AccessTokens struct {
	secret []byte
	now    func() time.Time
}

// NewAccessTokens signs with secret and reads the time from now (time.Now in production).
func NewAccessTokens(secret []byte, now func() time.Time) *AccessTokens {
	return &AccessTokens{secret: secret, now: now}
}

// Issue returns a signed access token for userID.
func (a *AccessTokens) Issue(userID uuid.UUID) (string, error) {
	issuedAt := a.now()
	claims := jwt.RegisteredClaims{
		Subject:   userID.String(),
		IssuedAt:  jwt.NewNumericDate(issuedAt),
		ExpiresAt: jwt.NewNumericDate(issuedAt.Add(AccessTokenTTL)),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(a.secret)
	if err != nil {
		return "", fmt.Errorf("sign access token: %w", err)
	}
	return signed, nil
}

// Verify returns the user id in a valid token, or ErrInvalidAccessToken.
func (a *AccessTokens) Verify(token string) (uuid.UUID, error) {
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(token, &claims,
		func(*jwt.Token) (any, error) { return a.secret, nil },
		// Accept HS256 only, so a token cannot pick a weaker algorithm (or "none") for itself.
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(clockSkew),
		jwt.WithTimeFunc(a.now),
	)
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("%w: %w", ErrInvalidAccessToken, err)
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("%w: subject is not a user id", ErrInvalidAccessToken)
	}
	return userID, nil
}

// NewOpaqueToken returns a random token to hand to the client and its hash, which is all the database keeps.
func NewOpaqueToken() (token, hash string, err error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", fmt.Errorf("read random token: %w", err)
	}
	token = base64.RawURLEncoding.EncodeToString(raw)
	return token, HashOpaqueToken(token), nil
}

// HashOpaqueToken returns the SHA-256 of token in hex. The token is already random, so no salt is needed.
func HashOpaqueToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
