package config

import (
	"strings"
	"testing"
)

var requiredEnvironment = map[string]string{
	"DB_URI":                       "postgres://localhost/synctex",
	"JWT_KEY":                      "access-secret",
	"COOKIE_SECURE":                "false",
	"FRONTEND_ORIGIN":              "http://localhost:3000",
	"B2_ENDPOINT":                  "http://localhost:9000",
	"B2_ACCESS_KEY":                "access-key",
	"B2_SECRET_KEY":                "secret-key",
	"B2_REGION":                    "us-east-1",
	"B2_BUCKET":                    "synctex",
	"REDIS_URL":                    "redis://localhost:6379/0",
	"EMAIL_DELIVERY_MODE":          "log",
	"PUBLIC_APP_URL":               "http://localhost:3000",
	"RATE_LOGIN_IP_LIMIT":          "5",
	"RATE_LOGIN_IP_WINDOW":         "1m",
	"RATE_LOGIN_ACCOUNT_LIMIT":     "10",
	"RATE_LOGIN_ACCOUNT_WINDOW":    "1h",
	"RATE_REGISTER_IP_LIMIT":       "3",
	"RATE_REGISTER_IP_WINDOW":      "1h",
	"RATE_REFRESH_LIMIT":           "30",
	"RATE_REFRESH_WINDOW":          "1h",
	"RATE_ACCOUNT_EMAIL_IP_LIMIT":  "5",
	"RATE_ACCOUNT_EMAIL_IP_WINDOW": "1h",
}

func TestLoadEnvironmentListsEveryMissingVariable(t *testing.T) {
	for name := range requiredEnvironment {
		t.Setenv(name, "")
	}

	_, err := LoadEnvironment()
	if err == nil {
		t.Fatal("LoadEnvironment() error = nil, want missing-variable error")
	}

	for name := range requiredEnvironment {
		if !strings.Contains(err.Error(), name) {
			t.Errorf("LoadEnvironment() error %q does not list %s", err, name)
		}
	}
}

func TestLoadEnvironmentParsesOptionalSettings(t *testing.T) {
	for name, value := range requiredEnvironment {
		t.Setenv(name, value)
	}
	t.Setenv("PORT", "")
	t.Setenv("FRONTEND_ORIGIN", "http://localhost:3000, https://app.example.com")
	t.Setenv("TRUSTED_PROXIES", "10.0.0.0/8, 192.168.0.0/16")

	environment, err := LoadEnvironment()
	if err != nil {
		t.Fatalf("LoadEnvironment() error = %v", err)
	}

	if environment.Port != defaultPort {
		t.Errorf("Port = %q, want %q", environment.Port, defaultPort)
	}
	if environment.SecureCookies {
		t.Error("SecureCookies = true, want false")
	}
	if len(environment.FrontendOrigins) != 2 {
		t.Errorf("FrontendOrigins = %#v, want two origins", environment.FrontendOrigins)
	}
	if len(environment.TrustedProxies) != 2 {
		t.Errorf("TrustedProxies = %#v, want two proxies", environment.TrustedProxies)
	}
}

func TestLoadEnvironmentRejectsInvalidCookieSecure(t *testing.T) {
	for name, value := range requiredEnvironment {
		t.Setenv(name, value)
	}
	t.Setenv("COOKIE_SECURE", "sometimes")

	_, err := LoadEnvironment()
	if err == nil || !strings.Contains(err.Error(), "COOKIE_SECURE") {
		t.Fatalf("LoadEnvironment() error = %v, want COOKIE_SECURE validation error", err)
	}
}

func TestLoadEnvironmentRejectsInvalidRateLimit(t *testing.T) {
	for name, value := range requiredEnvironment {
		t.Setenv(name, value)
	}
	t.Setenv("RATE_LOGIN_IP_LIMIT", "zero")

	_, err := LoadEnvironment()
	if err == nil || !strings.Contains(err.Error(), "RATE_LOGIN_IP_LIMIT") {
		t.Fatalf("LoadEnvironment() error = %v, want rate-limit validation error", err)
	}
}

func TestLoadEnvironmentRejectsInvalidEmailMode(t *testing.T) {
	for name, value := range requiredEnvironment {
		t.Setenv(name, value)
	}
	t.Setenv("EMAIL_DELIVERY_MODE", "maybe")

	_, err := LoadEnvironment()
	if err == nil || !strings.Contains(err.Error(), "EMAIL_DELIVERY_MODE") {
		t.Fatalf("LoadEnvironment() error = %v, want email-mode validation error", err)
	}
}
