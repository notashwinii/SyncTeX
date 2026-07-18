package errorhandler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

func HandleUserRetrievalError(c *gin.Context, err error) {
	if err == pgx.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"message": "User not registered, register now"})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	}
}
