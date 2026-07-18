package router

import (
	"context"
	"fmt"
	"net/http"
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
	authservices "github.com/synctex-org/backend/internal/services/authServices"
	storageServices "github.com/synctex-org/backend/internal/services/storageService"
)

type Options struct {
	AllowedOrigins []string
	TrustedProxies []string
	SecureCookies  bool
}

type databaseHealthChecker interface {
	Ping(context.Context) error
}

func SetupRouter(
	pool *pgxpool.Pool,
	s3 *storageServices.S3Service,
	options Options,
) (*gin.Engine, error) {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	if err := r.SetTrustedProxies(options.TrustedProxies); err != nil {
		return nil, fmt.Errorf("configure trusted proxies: %w", err)
	}

	fileService := storageServices.NewFileService(pool)
	storageHandler := storageHandlers.NewHandler(s3, fileService)
	sessionManager := authservices.NewSessionManager(pool)

	config := cors.Config{
		AllowOrigins:     options.AllowedOrigins,
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

	r.GET("/healthz", livenessHandler())
	r.GET("/readyz", readinessHandler(pool))
	r.GET("/health", readinessHandler(pool))

	// Public auth routes
	auth := api.Group("/auth")
	auth.POST("/register", authHandlers.Register(pool))
	auth.POST("/login", authHandlers.Login(pool, sessionManager, options.SecureCookies))
	auth.POST("/refresh", authHandlers.RefreshToken(sessionManager, options.SecureCookies))
	auth.POST("/logout", authHandlers.Logout(sessionManager, options.SecureCookies))

	// Authenticated routes
	secured := api.Group("")
	secured.Use(middleware.AuthRequired())

	secured.GET("/me", userHandlers.Me())

	// User search and lookup
	secured.GET("/users/search", userHandlers.SearchUsers(pool))
	secured.GET("/users/email/:email", userHandlers.GetUserByEmail(pool))
	secured.GET("/users/:id", userHandlers.GetUserByID(pool))

	secured.GET(
		"/ws/:projectID",
		middleware.RequireProjectAccess(pool, "projectID"),
		websocket.WsHandler(options.AllowedOrigins),
	)

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
	projects := secured.Group("/projects/:id")
	projects.Use(middleware.RequireProjectAccess(pool, "id"))
	projects.GET("", projectHandlers.GetProject(pool))
	projects.DELETE("", projectHandlers.DeleteProject(pool))
	projects.GET("/tree", storageHandlers.GetFileTree(pool))
	projects.POST("/storage/upload", storageHandler.Upload)
	projects.GET("/snapshot", snapshotHandlers.GetLatestSnapshot(pool))
	projects.PUT("/snapshot", snapshotHandlers.UpsertSnapshot(pool))
	projects.POST("/sessions", sessionHandlers.StartSession(pool))
	projects.POST("/download", downloadHandlers.DownloadPDF(pool))

	secured.GET(
		"/signed-url",
		middleware.RequireObjectProjectAccess(pool),
		storageHandler.GetSignedURL,
	)

	secured.POST("/sessions/:id/end", sessionHandlers.EndSession(pool))

	return r, nil
}

func livenessHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}

func readinessHandler(database databaseHealthChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		if err := database.Ping(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	}
}
