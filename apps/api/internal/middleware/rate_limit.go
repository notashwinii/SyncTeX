package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	ratelimitservices "github.com/synctex-org/backend/internal/services/rateLimitServices"
)

type RateLimiter interface {
	Allow(context.Context, string, int64, time.Duration) (ratelimitservices.Decision, error)
}

type RateLimit struct {
	Scope    string
	Limit    int64
	Window   time.Duration
	Identity func(*gin.Context) (string, error)
}

func EnforceRateLimit(limiter RateLimiter, config RateLimit) gin.HandlerFunc {
	return func(c *gin.Context) {
		identity, err := config.Identity(c)
		if err != nil || identity == "" {
			c.Next()
			return
		}

		decision, err := limiter.Allow(
			c.Request.Context(),
			hashedRateLimitKey(config.Scope, identity),
			config.Limit,
			config.Window,
		)
		if err != nil {
			log.Printf("rate limiter unavailable for %s: %v", config.Scope, err)
			c.Next()
			return
		}

		c.Header("X-RateLimit-Limit", strconv.FormatInt(config.Limit, 10))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(decision.Remaining, 10))
		if decision.Allowed {
			c.Next()
			return
		}

		retrySeconds := max(1, int64(math.Ceil(decision.RetryAfter.Seconds())))
		c.Header("Retry-After", strconv.FormatInt(retrySeconds, 10))
		c.AbortWithStatusJSON(
			http.StatusTooManyRequests,
			gin.H{
				"code":    "RATE_LIMITED",
				"message": "Too many requests",
			},
		)
	}
}

func ClientIPIdentity(c *gin.Context) (string, error) {
	return c.ClientIP(), nil
}

func JSONStringIdentity(field string) func(*gin.Context) (string, error) {
	return func(c *gin.Context) (string, error) {
		var payload map[string]any
		if err := c.ShouldBindBodyWithJSON(&payload); err != nil {
			return "", err
		}
		value, ok := payload[field].(string)
		if !ok {
			return "", fmt.Errorf("%s must be a string", field)
		}
		return strings.ToLower(strings.TrimSpace(value)), nil
	}
}

func hashedRateLimitKey(scope string, identity string) string {
	hash := sha256.Sum256([]byte(identity))
	return "ratelimit:" + scope + ":" + hex.EncodeToString(hash[:])
}
