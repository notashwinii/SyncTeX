-- name: CreateAuthSession :one
WITH new_session AS (
    SELECT gen_random_uuid() AS id
)
INSERT INTO auth_sessions (
    id,
    family_id,
    user_id,
    token_hash,
    expires_at,
    user_agent,
    ip_address
)
SELECT
    id,
    id,
    sqlc.arg(user_id)::text::uuid,
    sqlc.arg(token_hash),
    sqlc.arg(expires_at),
    sqlc.arg(user_agent),
    sqlc.arg(ip_address)
FROM new_session
RETURNING id::text AS id, family_id::text AS family_id;

-- name: GetAuthSessionByTokenHashForUpdate :one
SELECT
    session.id::text AS id,
    session.family_id::text AS family_id,
    session.user_id::text AS user_id,
    app_user.username,
    session.consumed_at,
    session.grace_expires_at,
    session.grace_reuse_count,
    session.expires_at,
    session.revoked_at
FROM auth_sessions AS session
JOIN users AS app_user ON app_user.id = session.user_id
WHERE session.token_hash = sqlc.arg(token_hash)
FOR UPDATE OF session;

-- name: ConsumeAuthSession :execrows
UPDATE auth_sessions
SET
    consumed_at = sqlc.arg(consumed_at),
    grace_expires_at = sqlc.arg(grace_expires_at)
WHERE id = sqlc.arg(id)::text::uuid
  AND consumed_at IS NULL
  AND revoked_at IS NULL;

-- name: ClaimAuthSessionGraceReuse :execrows
UPDATE auth_sessions
SET grace_reuse_count = grace_reuse_count + 1
WHERE id = sqlc.arg(id)::text::uuid
  AND consumed_at IS NOT NULL
  AND grace_expires_at >= sqlc.arg(now)
  AND grace_reuse_count = 0
  AND revoked_at IS NULL;

-- name: CreateRotatedAuthSession :one
INSERT INTO auth_sessions (
    family_id,
    user_id,
    parent_id,
    token_hash,
    expires_at,
    user_agent,
    ip_address
)
VALUES (
    sqlc.arg(family_id)::text::uuid,
    sqlc.arg(user_id)::text::uuid,
    sqlc.arg(parent_id)::text::uuid,
    sqlc.arg(token_hash),
    sqlc.arg(expires_at),
    sqlc.arg(user_agent),
    sqlc.arg(ip_address)
)
RETURNING id::text AS id;

-- name: RevokeAuthSessionFamily :exec
UPDATE auth_sessions AS target
SET revoked_at = COALESCE(target.revoked_at, sqlc.arg(revoked_time))
WHERE target.family_id = sqlc.arg(family_id)::text::uuid;

-- name: RevokeAuthSessionFamilyByTokenHash :exec
UPDATE auth_sessions AS target
SET revoked_at = COALESCE(target.revoked_at, sqlc.arg(revoked_time))
WHERE target.family_id = (
    SELECT source.family_id
    FROM auth_sessions AS source
    WHERE source.token_hash = sqlc.arg(presented_token_hash)
);

-- name: RevokeUserAuthSessions :exec
UPDATE auth_sessions AS target
SET revoked_at = COALESCE(target.revoked_at, sqlc.arg(revoked_time))
WHERE target.user_id = sqlc.arg(user_id)::text::uuid;
