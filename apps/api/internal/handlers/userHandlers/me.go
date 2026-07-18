package userHandlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Me godoc
// @Summary Get current user profile
// @Tags user
// @Produce json
// @Success 200 {object} map[string]string
// @Router /me [get]
func Me() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		username := c.GetString("username")
		c.JSON(http.StatusOK, gin.H{"user_id": userID, "username": username})
	}
}
