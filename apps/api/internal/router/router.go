package router

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"github.com/synctex-org/backend/internal/handlers/authHandlers"
	"github.com/synctex-org/backend/internal/handlers/downloadHandlers"
	"github.com/synctex-org/backend/internal/handlers/projectHandlers"
	"github.com/synctex-org/backend/internal/handlers/sessionHandlers"
	"github.com/synctex-org/backend/internal/handlers/snapshotHandlers"
	storageHandlers "github.com/synctex-org/backend/internal/handlers/storageHandlers"

	"github.com/synctex-org/backend/internal/handlers/userHandlers"
	"github.com/synctex-org/backend/internal/handlers/websocket"
	"github.com/synctex-org/backend/internal/handlers/workspaceHandlers"
	"github.com/synctex-org/backend/internal/middleware"
	storageServices "github.com/synctex-org/backend/internal/services/storageService"
)

func SetupRouter(pool *pgxpool.Pool, s3 *storageServices.S3Service) *gin.Engine {
	r := gin.Default()
	fileService := storageServices.NewFileService(pool)
	storageHandler := storageHandlers.NewHandler(s3, fileService)

	// CORS configuration: allow Next.js dev origin and Authorization header
	frontendOrigin := os.Getenv("FRONTEND_ORIGIN")
	if frontendOrigin == "" {
		frontendOrigin = "http://localhost:3000"
	}

	// Support comma-separated origins in FRONTEND_ORIGIN and allow common local dev hosts
	allowed := strings.Split(frontendOrigin, ",")

	config := cors.Config{
		AllowOriginFunc: func(origin string) bool {
			if origin == "" {
				return false
			}
			// exact match against configured list
			for _, o := range allowed {
				if strings.TrimSpace(o) == origin {
					return true
				}
			}
			// allow localhost variants for developer convenience
			if strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:") {
				return true
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(config))

	// Swagger endpoint
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	api := r.Group("/api")

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Welcome to SyncTex!!"})
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"version": "1.0.0",
		})
	})

	// Public auth routes
	auth := api.Group("/auth")
	auth.POST("/register", authHandlers.Register(pool))
	auth.POST("/login", authHandlers.Login(pool))
	auth.POST("/refresh", authHandlers.RefreshToken(pool))
	auth.POST("/logout", authHandlers.Logout())

	// Authenticated routes
	secured := api.Group("")
	secured.Use(middleware.AuthRequired())

	secured.GET("/me", userHandlers.Me())

	// User search and lookup
	secured.GET("/users/search", userHandlers.SearchUsers(pool))
	secured.GET("/users/email/:email", userHandlers.GetUserByEmail(pool))
	secured.GET("/users/:id", userHandlers.GetUserByID(pool))

	//ws
	secured.GET("/ws/:projectID", websocket.WsHandler(pool))

	// Workspaces
	secured.POST("/workspaces", workspaceHandlers.CreateWorkspace(pool))
	secured.GET("/workspaces", workspaceHandlers.ListMyWorkspaces(pool))
	secured.GET("/workspaces/:id", workspaceHandlers.GetWorkspace(pool))
	secured.POST("/workspaces/:id/members", workspaceHandlers.AddMember(pool))
	secured.GET("/workspaces/:id/members", workspaceHandlers.ListMembers(pool))

	// Workspace Invitations
	secured.POST("/workspaces/:id/invitations", workspaceHandlers.SendInvitation(pool))
	secured.GET("/workspaces/:id/invitations", workspaceHandlers.ListInvitations(pool))

	// User Invitations
	secured.GET("/invitations", workspaceHandlers.GetMyInvitations(pool))
	secured.POST("/invitations/:token/accept", workspaceHandlers.AcceptInvitation(pool))
	secured.POST("/invitations/:token/decline", workspaceHandlers.DeclineInvitation(pool))
	secured.DELETE("/invitations/:id", workspaceHandlers.CancelInvitation(pool))

	// Projects
	secured.POST("/workspaces/:id/projects", projectHandlers.CreateProject(pool))
	secured.GET("/workspaces/:id/projects", projectHandlers.ListProjects(pool))
	secured.GET("/projects/:id", projectHandlers.GetProject(pool))
	secured.DELETE("/projects/:id", projectHandlers.DeleteProject(pool))
	secured.GET(
		"/projects/:id/tree",
		storageHandlers.GetFileTree(pool),
	)

	secured.GET("/signed-url", storageHandler.GetSignedURL)

	// S3 routes
	secured.POST("/projects/:id/storage/upload", storageHandler.Upload)

	// Snapshots (latest only)
	secured.GET("/projects/:id/snapshot", snapshotHandlers.GetLatestSnapshot(pool))
	secured.PUT("/projects/:id/snapshot", snapshotHandlers.UpsertSnapshot(pool))

	// Sessions (basic lifecycle)
	secured.POST("/projects/:id/sessions", sessionHandlers.StartSession(pool))
	secured.POST("/sessions/:id/end", sessionHandlers.EndSession(pool))

	// Download PDF
	secured.POST("/projects/:id/download", downloadHandlers.DownloadPDF(pool))

	return r

}
