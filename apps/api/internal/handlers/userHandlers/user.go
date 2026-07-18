package userHandlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/schemas/userSchemas"
)

// SearchUsers godoc
// @Summary Search for users by username or email
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param q query string true "Search query (username or email)"
// @Success 200 {array} userSchemas.UserSearchResult
// @Router /users/search [get]
func SearchUsers(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "query parameter 'q' is required"})
			return
		}

		// Search by username or email (case-insensitive, partial match)
		rows, err := pool.Query(c, `
			SELECT id, username, email 
			FROM users 
			WHERE LOWER(username) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1)
			ORDER BY username
			LIMIT 10
		`, "%"+query+"%")

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		defer rows.Close()

		var users []userSchemas.UserSearchResult
		for rows.Next() {
			var user userSchemas.UserSearchResult
			if err := rows.Scan(&user.ID, &user.Username, &user.Email); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			users = append(users, user)
		}

		// Return empty array instead of null if no results
		if users == nil {
			users = []userSchemas.UserSearchResult{}
		}

		c.JSON(http.StatusOK, users)
	}
}

// GetUserByEmail godoc
// @Summary Get user by email address
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param email path string true "User email address"
// @Success 200 {object} userSchemas.UserSearchResult
// @Router /users/email/{email} [get]
func GetUserByEmail(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.Param("email")
		if email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "email parameter is required"})
			return
		}

		var user userSchemas.UserSearchResult
		err := pool.QueryRow(c, `
			SELECT id, username, email 
			FROM users 
			WHERE LOWER(email) = LOWER($1)
		`, email).Scan(&user.ID, &user.Username, &user.Email)

		if err != nil {
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"message": "user not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}

		c.JSON(http.StatusOK, user)
	}
}

// GetUserByID godoc
// @Summary Get user by ID
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} userSchemas.UserSearchResult
// @Router /users/{id} [get]
func GetUserByID(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")
		if userID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "user id parameter is required"})
			return
		}

		var user userSchemas.UserSearchResult
		err := pool.QueryRow(c, `
			SELECT id, username, email 
			FROM users 
			WHERE id = $1
		`, userID).Scan(&user.ID, &user.Username, &user.Email)

		if err != nil {
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"message": "user not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}

		c.JSON(http.StatusOK, user)
	}
}
