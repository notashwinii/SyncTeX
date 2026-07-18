// @title SyncTex API
// @version 1.0
// @description This is the SyncTex backend API server.
// @host
// @BasePath /api
// @schemes http https
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/synctex-org/backend/docs"
	"github.com/synctex-org/backend/internal/config"
	"github.com/synctex-org/backend/internal/config/db"
	"github.com/synctex-org/backend/internal/router"
	authservices "github.com/synctex-org/backend/internal/services/authServices"
	storage "github.com/synctex-org/backend/internal/services/storageService"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found; using process environment")
	}

	environment, err := config.LoadEnvironment()
	if err != nil {
		log.Fatal(err)
	}

	authservices.Configure(environment.JWTKey, environment.RefreshKey)

	pool, err := db.Connect(context.Background(), environment.DBURI)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	s3Client, err := config.InitS3(
		context.Background(),
		environment.S3Endpoint,
		environment.S3AccessKey,
		environment.S3SecretKey,
		environment.S3Region,
	)
	if err != nil {
		log.Fatal(err)
	}

	storageService := storage.NewS3Service(s3Client, environment.S3Bucket)

	gin.SetMode(gin.ReleaseMode)
	r, err := router.SetupRouter(pool, storageService, router.Options{
		AllowedOrigins: environment.FrontendOrigins,
		TrustedProxies: environment.TrustedProxies,
	})
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("Listening on port %s", environment.Port)
	log.Fatal(r.Run(":" + environment.Port))
}
