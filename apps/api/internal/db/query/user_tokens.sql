-- name: CreateUser :one
INSERT INTO users (
    email,
    username,
    hashed_password
)
VALUES (
    sqlc.arg(email),
    sqlc.arg(username),
    sqlc.arg(hashed_password)
)
RETURNING id::text AS id;

-- name: InvalidateUserTokens :exec
UPDATE user_tokens
SET used_at = sqlc.arg(used_at)
WHERE user_id = sqlc.arg(user_id)::text::uuid
  AND purpose = sqlc.arg(purpose)::user_token_purpose
  AND used_at IS NULL;

-- name: CreateUserToken :exec
INSERT INTO user_tokens (
    user_id,
    purpose,
    token_hash,
    expires_at
)
VALUES (
    sqlc.arg(user_id)::text::uuid,
    sqlc.arg(purpose)::user_token_purpose,
    sqlc.arg(token_hash),
    sqlc.arg(expires_at)
);

-- name: GetUserTokenForUpdate :one
SELECT
    token.id::text AS id,
    token.user_id::text AS user_id,
    token.expires_at,
    token.used_at,
    app_user.email::text AS email
FROM user_tokens AS token
JOIN users AS app_user ON app_user.id = token.user_id
WHERE token.token_hash = sqlc.arg(token_hash)
  AND token.purpose = sqlc.arg(purpose)::user_token_purpose
FOR UPDATE OF token;

-- name: MarkUserTokenUsed :exec
UPDATE user_tokens
SET used_at = sqlc.arg(used_at)
WHERE id = sqlc.arg(id)::text::uuid;

-- name: MarkUserEmailVerified :exec
UPDATE users
SET email_verified_at = COALESCE(email_verified_at, sqlc.arg(verified_at))
WHERE id = sqlc.arg(user_id)::text::uuid;

-- name: UpdateUserPassword :exec
UPDATE users
SET hashed_password = sqlc.arg(hashed_password)
WHERE id = sqlc.arg(user_id)::text::uuid;

-- name: GetUserIDByEmail :one
SELECT id::text AS id
FROM users
WHERE email = sqlc.arg(email);
