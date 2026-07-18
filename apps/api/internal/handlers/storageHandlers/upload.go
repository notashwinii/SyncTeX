package storage

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/synctex-org/backend/internal/services/storageService"
)

type Handler struct {
	S3          *storage.S3Service
	FileService *storage.FileService
}

func NewHandler(s3 *storage.S3Service, fs *storage.FileService) *Handler {
	return &Handler{
		S3:          s3,
		FileService: fs,
	}
}

func (h *Handler) Upload(c *gin.Context) {
	projectID := c.Param("id")
	fileType := c.PostForm("type")

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
		return
	}
	defer file.Close()

	key, _, err := h.S3.UploadProjectFile(
		c.Request.Context(),
		projectID,
		file,
		header,
		fileType,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	meta := &storage.FileMetadata{
		ProjectID:   projectID,
		FileType:    fileType,
		Filename:    header.Filename,
		ObjectKey:   key,
		ContentType: header.Header.Get("Content-Type"),
		UploadedBy:  c.GetString("userID"),
	}

	dbFile, err := h.FileService.InsertFileMetadata(c.Request.Context(), meta)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"object_key": dbFile.ObjectKey,
	})
}
