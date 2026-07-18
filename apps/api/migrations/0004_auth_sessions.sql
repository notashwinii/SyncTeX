-- +goose Up
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES auth_sessions(id) ON DELETE SET NULL,
  token_hash BYTEA UNIQUE NOT NULL,
  consumed_at TIMESTAMPTZ,
  grace_expires_at TIMESTAMPTZ,
  grace_reuse_count SMALLINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT auth_sessions_grace_reuse_nonnegative
    CHECK (grace_reuse_count >= 0),
  CONSTRAINT auth_sessions_family_fk
    FOREIGN KEY (family_id)
    REFERENCES auth_sessions(id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_auth_sessions_family ON auth_sessions(family_id);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);

-- +goose Down
DROP TABLE IF EXISTS auth_sessions;
