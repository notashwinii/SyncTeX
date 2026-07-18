package downloadHandlers

import (
	"fmt"
	"log"
	"net/http"

	downloadservices "github.com/synctex-org/backend/internal/services/downloadServices"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DownloadRequest struct {
	Content string `json:"content"`
}

func DownloadPDF(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing project id"})
			return
		}

		var req DownloadRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}

		if req.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "empty content"})
			return
		}

		pdfBytes, err := downloadservices.ReturnPdf(req.Content)
		if err != nil {
			log.Printf("PDF generation failed for project %s: %v", id, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to render pdf"})
			return
		}

		filename := fmt.Sprintf("%s.pdf", id)
		c.Header("Content-Description", "File Transfer")
		c.Header("Content-Type", "application/pdf")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		c.Header("Content-Transfer-Encoding", "binary")
		c.Data(http.StatusOK, "application/pdf", pdfBytes)
	}
}
