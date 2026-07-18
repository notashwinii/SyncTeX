package authservices

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"strings"
)

const (
	CSRFCookieName = "csrf_token"
	CSRFHeaderName = "X-CSRF-Token"
	csrfTokenBytes = 32
)

func GenerateCSRFToken() (string, error) {
	random := make([]byte, csrfTokenBytes)
	if _, err := rand.Read(random); err != nil {
		return "", err
	}

	payload := base64.RawURLEncoding.EncodeToString(random)
	return payload + "." + signCSRFToken(payload), nil
}

func ValidateCSRFToken(token string) bool {
	payload, signature, found := strings.Cut(token, ".")
	if !found || payload == "" || signature == "" || strings.Contains(signature, ".") {
		return false
	}

	expected := signCSRFToken(payload)
	return hmac.Equal([]byte(signature), []byte(expected))
}

func signCSRFToken(payload string) string {
	mac := hmac.New(sha256.New, JwtKey)
	_, _ = mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
