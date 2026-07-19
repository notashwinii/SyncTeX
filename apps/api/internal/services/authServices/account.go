package authservices

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/db"
	"golang.org/x/crypto/bcrypt"
)

const (
	userTokenBytes       = 32
	VerificationTokenTTL = 24 * time.Hour
	PasswordResetTTL     = 30 * time.Minute
)

var ErrInvalidUserToken = errors.New("invalid or expired user token")

type AccountToken struct {
	Email string
	Token string
}

type accountQueries interface {
	CreateUser(context.Context, db.CreateUserParams) (string, error)
	CreateUserToken(context.Context, db.CreateUserTokenParams) error
	GetUserTokenForUpdate(
		context.Context,
		db.GetUserTokenForUpdateParams,
	) (db.GetUserTokenForUpdateRow, error)
	InvalidateUserTokens(context.Context, db.InvalidateUserTokensParams) error
	MarkUserEmailVerified(context.Context, db.MarkUserEmailVerifiedParams) error
	MarkUserTokenUsed(context.Context, db.MarkUserTokenUsedParams) error
	RevokeUserAuthSessions(context.Context, db.RevokeUserAuthSessionsParams) error
	UpdateUserPassword(context.Context, db.UpdateUserPasswordParams) error
}

type accountStore interface {
	GetUserIDByEmail(context.Context, string) (string, error)
	InTransaction(context.Context, func(accountQueries) error) error
}

type pgAccountStore struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func newPGAccountStore(pool *pgxpool.Pool) *pgAccountStore {
	return &pgAccountStore{pool: pool, queries: db.New(pool)}
}

func (store *pgAccountStore) GetUserIDByEmail(
	ctx context.Context,
	email string,
) (string, error) {
	return store.queries.GetUserIDByEmail(ctx, email)
}

func (store *pgAccountStore) InTransaction(
	ctx context.Context,
	run func(accountQueries) error,
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

type AccountManager struct {
	store       accountStore
	now         func() time.Time
	tokenSource func() (string, error)
}

func NewAccountManager(pool *pgxpool.Pool) *AccountManager {
	return newAccountManager(newPGAccountStore(pool))
}

func newAccountManager(store accountStore) *AccountManager {
	return &AccountManager{
		store:       store,
		now:         time.Now,
		tokenSource: generateUserToken,
	}
}

func (manager *AccountManager) Register(
	ctx context.Context,
	email string,
	username string,
	hashedPassword string,
) (AccountToken, error) {
	token, err := manager.tokenSource()
	if err != nil {
		return AccountToken{}, fmt.Errorf("generate verification token: %w", err)
	}

	now := manager.now().UTC()
	normalizedEmail := normalizeEmail(email)
	err = manager.store.InTransaction(ctx, func(queries accountQueries) error {
		userID, err := queries.CreateUser(ctx, db.CreateUserParams{
			Email:          normalizedEmail,
			Username:       strings.TrimSpace(username),
			HashedPassword: hashedPassword,
		})
		if err != nil {
			return err
		}
		return queries.CreateUserToken(ctx, db.CreateUserTokenParams{
			UserID:    userID,
			Purpose:   db.UserTokenPurposeVerifyEmail,
			TokenHash: hashUserToken(token),
			ExpiresAt: timestamp(now.Add(VerificationTokenTTL)),
		})
	})
	if err != nil {
		return AccountToken{}, err
	}
	return AccountToken{Email: normalizedEmail, Token: token}, nil
}

func (manager *AccountManager) IssueEmailVerification(
	ctx context.Context,
	email string,
) (AccountToken, bool, error) {
	return manager.issueForEmail(
		ctx,
		email,
		db.UserTokenPurposeVerifyEmail,
		VerificationTokenTTL,
	)
}

func (manager *AccountManager) IssuePasswordReset(
	ctx context.Context,
	email string,
) (AccountToken, bool, error) {
	return manager.issueForEmail(
		ctx,
		email,
		db.UserTokenPurposeResetPassword,
		PasswordResetTTL,
	)
}

func (manager *AccountManager) VerifyEmail(ctx context.Context, token string) error {
	return manager.consumeToken(
		ctx,
		token,
		db.UserTokenPurposeVerifyEmail,
		func(queries accountQueries, row db.GetUserTokenForUpdateRow, now time.Time) error {
			return queries.MarkUserEmailVerified(ctx, db.MarkUserEmailVerifiedParams{
				VerifiedAt: timestamp(now),
				UserID:     row.UserID,
			})
		},
	)
}

func (manager *AccountManager) ResetPassword(
	ctx context.Context,
	token string,
	password string,
) error {
	if err := ValidatePassword(password); err != nil {
		return err
	}
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	return manager.consumeToken(
		ctx,
		token,
		db.UserTokenPurposeResetPassword,
		func(queries accountQueries, row db.GetUserTokenForUpdateRow, now time.Time) error {
			if err := queries.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{
				HashedPassword: string(hashedPassword),
				UserID:         row.UserID,
			}); err != nil {
				return err
			}
			return queries.RevokeUserAuthSessions(
				ctx,
				db.RevokeUserAuthSessionsParams{
					RevokedTime: timestamp(now),
					UserID:      row.UserID,
				},
			)
		},
	)
}

func (manager *AccountManager) issueForEmail(
	ctx context.Context,
	email string,
	purpose db.UserTokenPurpose,
	ttl time.Duration,
) (AccountToken, bool, error) {
	normalizedEmail := normalizeEmail(email)
	userID, err := manager.store.GetUserIDByEmail(ctx, normalizedEmail)
	if errors.Is(err, pgx.ErrNoRows) {
		return AccountToken{}, false, nil
	}
	if err != nil {
		return AccountToken{}, false, fmt.Errorf("get user for token: %w", err)
	}

	token, err := manager.tokenSource()
	if err != nil {
		return AccountToken{}, false, fmt.Errorf("generate user token: %w", err)
	}
	now := manager.now().UTC()
	err = manager.store.InTransaction(ctx, func(queries accountQueries) error {
		if err := queries.InvalidateUserTokens(ctx, db.InvalidateUserTokensParams{
			UsedAt:  timestamp(now),
			UserID:  userID,
			Purpose: purpose,
		}); err != nil {
			return err
		}
		return queries.CreateUserToken(ctx, db.CreateUserTokenParams{
			UserID:    userID,
			Purpose:   purpose,
			TokenHash: hashUserToken(token),
			ExpiresAt: timestamp(now.Add(ttl)),
		})
	})
	if err != nil {
		return AccountToken{}, false, fmt.Errorf("issue user token: %w", err)
	}
	return AccountToken{Email: normalizedEmail, Token: token}, true, nil
}

func (manager *AccountManager) consumeToken(
	ctx context.Context,
	token string,
	purpose db.UserTokenPurpose,
	action func(accountQueries, db.GetUserTokenForUpdateRow, time.Time) error,
) error {
	if token == "" {
		return ErrInvalidUserToken
	}

	now := manager.now().UTC()
	err := manager.store.InTransaction(ctx, func(queries accountQueries) error {
		row, err := queries.GetUserTokenForUpdate(
			ctx,
			db.GetUserTokenForUpdateParams{
				TokenHash: hashUserToken(token),
				Purpose:   purpose,
			},
		)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrInvalidUserToken
		}
		if err != nil {
			return err
		}
		if row.UsedAt.Valid || !row.ExpiresAt.Valid || !row.ExpiresAt.Time.After(now) {
			return ErrInvalidUserToken
		}
		if err := action(queries, row, now); err != nil {
			return err
		}
		return queries.MarkUserTokenUsed(ctx, db.MarkUserTokenUsedParams{
			UsedAt: timestamp(now),
			ID:     row.ID,
		})
	})
	if errors.Is(err, ErrInvalidUserToken) {
		return ErrInvalidUserToken
	}
	if err != nil {
		return fmt.Errorf("consume user token: %w", err)
	}
	return nil
}

func generateUserToken() (string, error) {
	token := make([]byte, userTokenBytes)
	if _, err := rand.Read(token); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(token), nil
}

func hashUserToken(token string) []byte {
	hash := sha256.Sum256([]byte(token))
	return hash[:]
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
