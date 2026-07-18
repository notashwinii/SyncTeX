package authservices

import (
	"strings"
	"testing"
)

func TestCSRFTokenValidation(t *testing.T) {
	Configure("csrf-test-secret")

	token, err := GenerateCSRFToken()
	if err != nil {
		t.Fatalf("GenerateCSRFToken() error = %v", err)
	}
	if !ValidateCSRFToken(token) {
		t.Fatal("ValidateCSRFToken() rejected a generated token")
	}

	payload, signature, found := strings.Cut(token, ".")
	if !found {
		t.Fatal("generated token does not contain a signature")
	}

	tests := []string{
		"",
		payload,
		payload + "." + signature + ".extra",
		payload + "changed." + signature,
		payload + "." + signature[:len(signature)-1] + "x",
	}
	for _, candidate := range tests {
		if ValidateCSRFToken(candidate) {
			t.Fatalf("ValidateCSRFToken(%q) = true, want false", candidate)
		}
	}
}

func TestGenerateCSRFTokenUsesFreshRandomness(t *testing.T) {
	Configure("csrf-test-secret")

	first, err := GenerateCSRFToken()
	if err != nil {
		t.Fatalf("first GenerateCSRFToken() error = %v", err)
	}
	second, err := GenerateCSRFToken()
	if err != nil {
		t.Fatalf("second GenerateCSRFToken() error = %v", err)
	}
	if first == second {
		t.Fatal("GenerateCSRFToken() returned the same token twice")
	}
}
