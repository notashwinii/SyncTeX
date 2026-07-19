package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	ratelimitservices "github.com/synctex-org/backend/internal/services/rateLimitServices"
)

type rateLimiterStub struct {
	decision ratelimitservices.Decision
	err      error
	key      string
	limit    int64
	window   time.Duration
}

func (stub *rateLimiterStub) Allow(
	_ context.Context,
	key string,
	limit int64,
	window time.Duration,
) (ratelimitservices.Decision, error) {
	stub.key = key
	stub.limit = limit
	stub.window = window
	return stub.decision, stub.err
}

func TestEnforceRateLimitRejectsExceededWindow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	limiter := &rateLimiterStub{
		decision: ratelimitservices.Decision{
			Remaining:  0,
			RetryAfter: 1500 * time.Millisecond,
		},
	}
	router := gin.New()
	router.Use(EnforceRateLimit(limiter, RateLimit{
		Scope:    "login-ip",
		Limit:    5,
		Window:   time.Minute,
		Identity: func(*gin.Context) (string, error) { return "127.0.0.1", nil },
	}))
	router.POST("/", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/", nil))

	if recorder.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusTooManyRequests)
	}
	if got := recorder.Header().Get("Retry-After"); got != "2" {
		t.Fatalf("Retry-After = %q, want 2", got)
	}
	if limiter.key == "" || limiter.key == "127.0.0.1" {
		t.Fatalf("rate-limit key = %q, want hashed identity", limiter.key)
	}
}

func TestEnforceRateLimitFailsOpen(t *testing.T) {
	gin.SetMode(gin.TestMode)
	limiter := &rateLimiterStub{err: errors.New("redis unavailable")}
	router := gin.New()
	router.Use(EnforceRateLimit(limiter, RateLimit{
		Scope:    "register-ip",
		Limit:    3,
		Window:   time.Hour,
		Identity: func(*gin.Context) (string, error) { return "127.0.0.1", nil },
	}))
	router.POST("/", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/", nil))

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusNoContent)
	}
}

func TestJSONStringIdentityNormalizesValue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(
		http.MethodPost,
		"/",
		strings.NewReader(`{"email":"  Student@Example.COM "}`),
	)
	context.Request.Header.Set("Content-Type", "application/json")

	identity, err := JSONStringIdentity("email")(context)
	if err != nil {
		t.Fatalf("JSONStringIdentity() error = %v", err)
	}
	if identity != "student@example.com" {
		t.Fatalf("identity = %q, want student@example.com", identity)
	}
}
