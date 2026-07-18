package config

import (
	"strings"
	"testing"
)

var requiredEnvironment = map[string]string{
	"DB_URI":          "postgres://localhost/synctex",
	"JWT_KEY":         "access-secret",
	"REFRESH_KEY":     "refresh-secret",
	"FRONTEND_ORIGIN": "http://localhost:3000",
	"B2_ENDPOINT":     "http://localhost:9000",
	"B2_ACCESS_KEY":   "access-key",
	"B2_SECRET_KEY":   "secret-key",
	"B2_REGION":       "us-east-1",
	"B2_BUCKET":       "synctex",
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
	if len(environment.FrontendOrigins) != 2 {
		t.Errorf("FrontendOrigins = %#v, want two origins", environment.FrontendOrigins)
	}
	if len(environment.TrustedProxies) != 2 {
		t.Errorf("TrustedProxies = %#v, want two proxies", environment.TrustedProxies)
	}
}
