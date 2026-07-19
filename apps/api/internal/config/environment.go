package config

import (
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
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
	RedisURL        string
	AuthRateLimits  AuthRateLimits
	EmailMode       string
	PublicAppURL    string
}

type RateLimit struct {
	Limit  int64
	Window time.Duration
}

type AuthRateLimits struct {
	LoginIP      RateLimit
	LoginAccount RateLimit
	RegisterIP   RateLimit
	Refresh      RateLimit
	AccountEmail RateLimit
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
		"REDIS_URL":       strings.TrimSpace(os.Getenv("REDIS_URL")),
		"EMAIL_DELIVERY_MODE": strings.TrimSpace(
			os.Getenv("EMAIL_DELIVERY_MODE"),
		),
		"PUBLIC_APP_URL": strings.TrimSpace(os.Getenv("PUBLIC_APP_URL")),
		"RATE_LOGIN_IP_LIMIT": strings.TrimSpace(
			os.Getenv("RATE_LOGIN_IP_LIMIT"),
		),
		"RATE_LOGIN_IP_WINDOW": strings.TrimSpace(
			os.Getenv("RATE_LOGIN_IP_WINDOW"),
		),
		"RATE_LOGIN_ACCOUNT_LIMIT": strings.TrimSpace(
			os.Getenv("RATE_LOGIN_ACCOUNT_LIMIT"),
		),
		"RATE_LOGIN_ACCOUNT_WINDOW": strings.TrimSpace(
			os.Getenv("RATE_LOGIN_ACCOUNT_WINDOW"),
		),
		"RATE_REGISTER_IP_LIMIT": strings.TrimSpace(
			os.Getenv("RATE_REGISTER_IP_LIMIT"),
		),
		"RATE_REGISTER_IP_WINDOW": strings.TrimSpace(
			os.Getenv("RATE_REGISTER_IP_WINDOW"),
		),
		"RATE_REFRESH_LIMIT": strings.TrimSpace(
			os.Getenv("RATE_REFRESH_LIMIT"),
		),
		"RATE_REFRESH_WINDOW": strings.TrimSpace(
			os.Getenv("RATE_REFRESH_WINDOW"),
		),
		"RATE_ACCOUNT_EMAIL_IP_LIMIT": strings.TrimSpace(
			os.Getenv("RATE_ACCOUNT_EMAIL_IP_LIMIT"),
		),
		"RATE_ACCOUNT_EMAIL_IP_WINDOW": strings.TrimSpace(
			os.Getenv("RATE_ACCOUNT_EMAIL_IP_WINDOW"),
		),
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

	loginIP, err := parseRateLimit(required, "RATE_LOGIN_IP")
	if err != nil {
		return Environment{}, err
	}
	loginAccount, err := parseRateLimit(required, "RATE_LOGIN_ACCOUNT")
	if err != nil {
		return Environment{}, err
	}
	registerIP, err := parseRateLimit(required, "RATE_REGISTER_IP")
	if err != nil {
		return Environment{}, err
	}
	refresh, err := parseRateLimit(required, "RATE_REFRESH")
	if err != nil {
		return Environment{}, err
	}
	accountEmail, err := parseRateLimit(required, "RATE_ACCOUNT_EMAIL_IP")
	if err != nil {
		return Environment{}, err
	}

	emailMode := strings.ToLower(required["EMAIL_DELIVERY_MODE"])
	if emailMode != "log" && emailMode != "smtp" {
		return Environment{}, fmt.Errorf("EMAIL_DELIVERY_MODE must be log or smtp")
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
		RedisURL:        required["REDIS_URL"],
		EmailMode:       emailMode,
		PublicAppURL:    strings.TrimRight(required["PUBLIC_APP_URL"], "/"),
		AuthRateLimits: AuthRateLimits{
			LoginIP:      loginIP,
			LoginAccount: loginAccount,
			RegisterIP:   registerIP,
			Refresh:      refresh,
			AccountEmail: accountEmail,
		},
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

func parseRateLimit(values map[string]string, prefix string) (RateLimit, error) {
	limitName := prefix + "_LIMIT"
	windowName := prefix + "_WINDOW"

	limit, err := strconv.ParseInt(values[limitName], 10, 64)
	if err != nil || limit <= 0 {
		return RateLimit{}, fmt.Errorf("%s must be a positive integer", limitName)
	}
	window, err := time.ParseDuration(values[windowName])
	if err != nil || window <= 0 {
		return RateLimit{}, fmt.Errorf("%s must be a positive duration", windowName)
	}
	return RateLimit{Limit: limit, Window: window}, nil
}
