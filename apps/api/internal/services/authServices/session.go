package authservices

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/db"
)

const (
	refreshTokenBytes = 32
	refreshGrace      = 10 * time.Second
)

var (
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	ErrSessionCompromised  = errors.New("refresh token reuse detected")
)

type RotatedSession struct {
	RefreshToken string
	SessionID    string
	UserID       string
	Username     string
}

type sessionQueries interface {
	ClaimAuthSessionGraceReuse(context.Context, db.ClaimAuthSessionGraceReuseParams) (int64, error)
	ConsumeAuthSession(context.Context, db.ConsumeAuthSessionParams) (int64, error)
	CreateRotatedAuthSession(context.Context, db.CreateRotatedAuthSessionParams) (string, error)
	GetAuthSessionByTokenHashForUpdate(context.Context, []byte) (db.GetAuthSessionByTokenHashForUpdateRow, error)
	RevokeAuthSessionFamily(context.Context, db.RevokeAuthSessionFamilyParams) error
}

type sessionStore interface {
	CreateAuthSession(context.Context, db.CreateAuthSessionParams) (db.CreateAuthSessionRow, error)
	GetAuthSessionFamilyByTokenHash(context.Context, []byte) (string, error)
	InTransaction(context.Context, func(sessionQueries) error) error
	RevokeAuthSessionFamilyByTokenHash(context.Context, db.RevokeAuthSessionFamilyByTokenHashParams) error
}

type pgSessionStore struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func newPGSessionStore(pool *pgxpool.Pool) *pgSessionStore {
	return &pgSessionStore{pool: pool, queries: db.New(pool)}
}

func (store *pgSessionStore) CreateAuthSession(
	ctx context.Context,
	params db.CreateAuthSessionParams,
) (db.CreateAuthSessionRow, error) {
	return store.queries.CreateAuthSession(ctx, params)
}

func (store *pgSessionStore) GetAuthSessionFamilyByTokenHash(
	ctx context.Context,
	tokenHash []byte,
) (string, error) {
	return store.queries.GetAuthSessionFamilyByTokenHash(ctx, tokenHash)
}

func (store *pgSessionStore) RevokeAuthSessionFamilyByTokenHash(
	ctx context.Context,
	params db.RevokeAuthSessionFamilyByTokenHashParams,
) error {
	return store.queries.RevokeAuthSessionFamilyByTokenHash(ctx, params)
}

func (store *pgSessionStore) InTransaction(
	ctx context.Context,
	run func(sessionQueries) error,
) error {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := run(db.New(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type SessionManager struct {
	store        sessionStore
	now          func() time.Time
	tokenSource  func() (string, error)
	refreshGrace time.Duration
}

func NewSessionManager(pool *pgxpool.Pool) *SessionManager {
	return newSessionManager(newPGSessionStore(pool))
}

func newSessionManager(store sessionStore) *SessionManager {
	return &SessionManager{
		store:        store,
		now:          time.Now,
		tokenSource:  generateOpaqueToken,
		refreshGrace: refreshGrace,
	}
}

func (manager *SessionManager) Issue(
	ctx context.Context,
	userID string,
	userAgent string,
	ipAddress string,
) (RotatedSession, error) {
	refreshToken, err := manager.tokenSource()
	if err != nil {
		return RotatedSession{}, fmt.Errorf("generate refresh token: %w", err)
	}

	now := manager.now().UTC()
	session, err := manager.store.CreateAuthSession(ctx, db.CreateAuthSessionParams{
		UserID:    userID,
		TokenHash: hashRefreshToken(refreshToken),
		ExpiresAt: timestamp(now.Add(RefreshTime)),
		UserAgent: userAgent,
		IpAddress: ipAddress,
	})
	if err != nil {
		return RotatedSession{}, fmt.Errorf("create auth session: %w", err)
	}

	return RotatedSession{
		RefreshToken: refreshToken,
		SessionID:    session.ID,
		UserID:       userID,
	}, nil
}

func (manager *SessionManager) Rotate(
	ctx context.Context,
	presentedToken string,
	userAgent string,
	ipAddress string,
) (RotatedSession, error) {
	if presentedToken == "" {
		return RotatedSession{}, ErrInvalidRefreshToken
	}

	nextToken, err := manager.tokenSource()
	if err != nil {
		return RotatedSession{}, fmt.Errorf("generate refresh token: %w", err)
	}

	now := manager.now().UTC()
	var rotated RotatedSession
	var outcome error

	err = manager.store.InTransaction(ctx, func(queries sessionQueries) error {
		current, err := queries.GetAuthSessionByTokenHashForUpdate(
			ctx,
			hashRefreshToken(presentedToken),
		)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrInvalidRefreshToken
		}
		if err != nil {
			return err
		}
		if current.RevokedAt.Valid || !current.ExpiresAt.Valid || !current.ExpiresAt.Time.After(now) {
			return ErrInvalidRefreshToken
		}

		if current.ConsumedAt.Valid {
			graceRows, err := queries.ClaimAuthSessionGraceReuse(
				ctx,
				db.ClaimAuthSessionGraceReuseParams{
					ID:  current.ID,
					Now: timestamp(now),
				},
			)
			if err != nil {
				return err
			}
			if graceRows != 1 {
				if err := queries.RevokeAuthSessionFamily(
					ctx,
					db.RevokeAuthSessionFamilyParams{
						RevokedTime: timestamp(now),
						FamilyID:    current.FamilyID,
					},
				); err != nil {
					return err
				}
				outcome = ErrSessionCompromised
				return nil
			}
		} else {
			consumedRows, err := queries.ConsumeAuthSession(
				ctx,
				db.ConsumeAuthSessionParams{
					ConsumedAt:     timestamp(now),
					GraceExpiresAt: timestamp(now.Add(manager.refreshGrace)),
					ID:             current.ID,
				},
			)
			if err != nil {
				return err
			}
			if consumedRows != 1 {
				return ErrInvalidRefreshToken
			}
		}

		sessionID, err := queries.CreateRotatedAuthSession(
			ctx,
			db.CreateRotatedAuthSessionParams{
				FamilyID:  current.FamilyID,
				UserID:    current.UserID,
				ParentID:  current.ID,
				TokenHash: hashRefreshToken(nextToken),
				ExpiresAt: current.ExpiresAt,
				UserAgent: userAgent,
				IpAddress: ipAddress,
			},
		)
		if err != nil {
			return err
		}

		rotated = RotatedSession{
			RefreshToken: nextToken,
			SessionID:    sessionID,
			UserID:       current.UserID,
			Username:     current.Username,
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, ErrInvalidRefreshToken) {
			return RotatedSession{}, ErrInvalidRefreshToken
		}
		return RotatedSession{}, fmt.Errorf("rotate auth session: %w", err)
	}
	if outcome != nil {
		return RotatedSession{}, outcome
	}
	return rotated, nil
}

func (manager *SessionManager) Revoke(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	return manager.store.RevokeAuthSessionFamilyByTokenHash(
		ctx,
		db.RevokeAuthSessionFamilyByTokenHashParams{
			RevokedTime:        timestamp(manager.now().UTC()),
			PresentedTokenHash: hashRefreshToken(refreshToken),
		},
	)
}

func (manager *SessionManager) FamilyID(
	ctx context.Context,
	refreshToken string,
) (string, error) {
	if refreshToken == "" {
		return "", ErrInvalidRefreshToken
	}

	familyID, err := manager.store.GetAuthSessionFamilyByTokenHash(
		ctx,
		hashRefreshToken(refreshToken),
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrInvalidRefreshToken
	}
	if err != nil {
		return "", fmt.Errorf("get auth session family: %w", err)
	}
	return familyID, nil
}

func generateOpaqueToken() (string, error) {
	token := make([]byte, refreshTokenBytes)
	if _, err := rand.Read(token); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(token), nil
}

func hashRefreshToken(token string) []byte {
	hash := sha256.Sum256([]byte(token))
	return hash[:]
}

func timestamp(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: value, Valid: true}
}
