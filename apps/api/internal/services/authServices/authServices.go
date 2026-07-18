package authservices

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/authQueries"
	"github.com/synctex-org/backend/schemas/userSchemas"
	"golang.org/x/crypto/bcrypt"
)

func GetUserByEmail(ctx context.Context, pool *pgxpool.Pool, email string) (*userSchemas.User, error) {
	var user userSchemas.User
	err := pool.QueryRow(ctx, authQueries.Query.RetrieveUserByEmail, email).Scan(&user.ID, &user.UserName, &user.Email, &user.HashedPassword)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func CheckPassword(hashed []byte, plain string) bool {
	return bcrypt.CompareHashAndPassword(hashed, []byte(plain)) == nil
}
