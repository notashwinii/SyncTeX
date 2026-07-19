package ratelimitservices

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	memberBytes      = 12
	redisTimeout     = 500 * time.Millisecond
	redisMaxRetries  = -1
	redisDialRetries = 1
)

var slidingWindowScript = redis.NewScript(`
local key = KEYS[1]
local redis_time = redis.call("TIME")
local now = (tonumber(redis_time[1]) * 1000) + math.floor(tonumber(redis_time[2]) / 1000)
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local member = ARGV[3]

redis.call("ZREMRANGEBYSCORE", key, "-inf", now - window)
local count = redis.call("ZCARD", key)

if count >= limit then
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  local retry_after = window
  if oldest[2] then
    retry_after = math.max(1, window - (now - tonumber(oldest[2])))
  end
  return {0, count, retry_after}
end

redis.call("ZADD", key, now, member)
redis.call("PEXPIRE", key, window)
return {1, count + 1, 0}
`)

type Decision struct {
	Allowed    bool
	Remaining  int64
	RetryAfter time.Duration
}

type Limiter struct {
	client       *redis.Client
	memberSource func() (string, error)
}

func New(redisURL string) (*Limiter, error) {
	options, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	options.DialTimeout = redisTimeout
	options.ReadTimeout = redisTimeout
	options.WriteTimeout = redisTimeout
	options.MaxRetries = redisMaxRetries
	options.DialerRetries = redisDialRetries
	options.MinRetryBackoff = -1
	options.MaxRetryBackoff = -1

	return &Limiter{
		client:       redis.NewClient(options),
		memberSource: randomMember,
	}, nil
}

func (limiter *Limiter) Allow(
	ctx context.Context,
	key string,
	limit int64,
	window time.Duration,
) (Decision, error) {
	member, err := limiter.memberSource()
	if err != nil {
		return Decision{}, fmt.Errorf("generate rate-limit member: %w", err)
	}

	result, err := slidingWindowScript.Run(
		ctx,
		limiter.client,
		[]string{key},
		window.Milliseconds(),
		limit,
		member,
	).Slice()
	if err != nil {
		return Decision{}, fmt.Errorf("evaluate rate limit: %w", err)
	}
	if len(result) != 3 {
		return Decision{}, fmt.Errorf("unexpected rate-limit result length: %d", len(result))
	}

	allowed, err := resultInt64(result[0])
	if err != nil {
		return Decision{}, err
	}
	count, err := resultInt64(result[1])
	if err != nil {
		return Decision{}, err
	}
	retryMilliseconds, err := resultInt64(result[2])
	if err != nil {
		return Decision{}, err
	}

	return Decision{
		Allowed:    allowed == 1,
		Remaining:  max(0, limit-count),
		RetryAfter: time.Duration(retryMilliseconds) * time.Millisecond,
	}, nil
}

func (limiter *Limiter) Close() error {
	return limiter.client.Close()
}

func randomMember() (string, error) {
	value := make([]byte, memberBytes)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func resultInt64(value any) (int64, error) {
	integer, ok := value.(int64)
	if !ok {
		return 0, fmt.Errorf("unexpected rate-limit result type %T", value)
	}
	return integer, nil
}
