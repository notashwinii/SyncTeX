package config

import (
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
)

const defaultPort = "8080"

type Environment struct {
	DBURI           string
	JWTKey          string
	SecureCookies   bool
	Port            string
	FrontendOrigins []string
	TrustedProxies  []string
	S3Endpoint      string
	S3AccessKey     string
	S3SecretKey     string
	S3Region        string
	S3Bucket        string
}

func LoadEnvironment() (Environment, error) {
	required := map[string]string{
		"DB_URI":          strings.TrimSpace(os.Getenv("DB_URI")),
		"JWT_KEY":         strings.TrimSpace(os.Getenv("JWT_KEY")),
		"COOKIE_SECURE":   strings.TrimSpace(os.Getenv("COOKIE_SECURE")),
		"FRONTEND_ORIGIN": strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN")),
		"B2_ENDPOINT":     strings.TrimSpace(os.Getenv("B2_ENDPOINT")),
		"B2_ACCESS_KEY":   strings.TrimSpace(os.Getenv("B2_ACCESS_KEY")),
		"B2_SECRET_KEY":   strings.TrimSpace(os.Getenv("B2_SECRET_KEY")),
		"B2_REGION":       strings.TrimSpace(os.Getenv("B2_REGION")),
		"B2_BUCKET":       strings.TrimSpace(os.Getenv("B2_BUCKET")),
	}

	var missing []string
	for name, value := range required {
		if value == "" {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return Environment{}, fmt.Errorf(
			"missing required environment variables: %s",
			strings.Join(missing, ", "),
		)
	}

	secureCookies, err := strconv.ParseBool(required["COOKIE_SECURE"])
	if err != nil {
		return Environment{}, fmt.Errorf("COOKIE_SECURE must be true or false")
	}

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = defaultPort
	}

	return Environment{
		DBURI:           required["DB_URI"],
		JWTKey:          required["JWT_KEY"],
		SecureCookies:   secureCookies,
		Port:            port,
		FrontendOrigins: splitCommaSeparated(required["FRONTEND_ORIGIN"]),
		TrustedProxies:  splitCommaSeparated(os.Getenv("TRUSTED_PROXIES")),
		S3Endpoint:      required["B2_ENDPOINT"],
		S3AccessKey:     required["B2_ACCESS_KEY"],
		S3SecretKey:     required["B2_SECRET_KEY"],
		S3Region:        required["B2_REGION"],
		S3Bucket:        required["B2_BUCKET"],
	}, nil
}

func splitCommaSeparated(value string) []string {
	var values []string
	for item := range strings.SplitSeq(value, ",") {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			values = append(values, trimmed)
		}
	}
	return values
}
