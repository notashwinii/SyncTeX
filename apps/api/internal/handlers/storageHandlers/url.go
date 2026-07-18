package storage

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func isTextFile(key string) bool {
	key = strings.ToLower(key)
	return strings.HasSuffix(key, ".tex") ||
		strings.HasSuffix(key, ".bib") ||
		strings.HasSuffix(key, ".txt")
}

func (h *Handler) GetSignedURL(c *gin.Context) {
	objectKey := c.Query("key")
	if objectKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing object key"})
		return
	}
	if isTextFile(objectKey) {
		h.streamText(c, objectKey)
		return
	}
	expiry := 15 * time.Minute

	url, err := h.S3.GetSignedDownloadURL(
		c.Request.Context(),
		objectKey,
		expiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":     url,
		"expires": expiry,
	})
}

func (h *Handler) streamText(c *gin.Context, objectKey string) {
	body, contentType, err := h.S3.StreamObject(
		c.Request.Context(),
		objectKey,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer body.Close()

	ct := "text/plain; charset=utf-8"
	if contentType != nil && strings.HasPrefix(*contentType, "text/") {
		ct = *contentType
	}

	c.Status(http.StatusOK)
	c.Header("Content-Type", ct)
	c.Header("Cache-Control", "no-store")

	_, _ = io.Copy(c.Writer, body)
}
