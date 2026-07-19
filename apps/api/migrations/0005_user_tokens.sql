-- +goose Up
CREATE EXTENSION IF NOT EXISTS citext;

-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (
    SELECT lower(email)
    FROM users
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'users contains email addresses that differ only by case';
  END IF;
END $$;
-- +goose StatementEnd

ALTER TABLE users
  ALTER COLUMN email TYPE CITEXT,
  ADD COLUMN email_verified_at TIMESTAMPTZ;

UPDATE users
SET email_verified_at = now()
WHERE email_verified_at IS NULL;

CREATE TYPE user_token_purpose AS ENUM (
  'verify_email',
  'reset_password'
);

CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose user_token_purpose NOT NULL,
  token_hash BYTEA UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_tokens_user_purpose
  ON user_tokens(user_id, purpose);
CREATE INDEX idx_user_tokens_expires
  ON user_tokens(expires_at)
  WHERE used_at IS NULL;

-- +goose Down
DROP TABLE IF EXISTS user_tokens;
DROP TYPE IF EXISTS user_token_purpose;
ALTER TABLE users
  DROP COLUMN IF EXISTS email_verified_at,
  ALTER COLUMN email TYPE VARCHAR(255);
DROP EXTENSION IF EXISTS citext;
