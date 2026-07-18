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
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/synctex-org/backend/docs"
	"github.com/synctex-org/backend/internal/config"
	"github.com/synctex-org/backend/internal/config/db"
	"github.com/synctex-org/backend/internal/router"
	storage "github.com/synctex-org/backend/internal/services/storageService"
)

func init() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on system environment variables")
	}

}

func main() {

	db := db.ConnectDB()
	defer db.Close()

	s3 := config.InitS3()
	bucket := os.Getenv("B2_BUCKET")
	if bucket == "" {
		log.Fatal("B2_BUCKET not set")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	s3Client := storage.NewS3Service(s3, bucket)

	r := router.SetupRouter(db, s3Client)
	log.Printf("Listening on port %s", port)
	log.Fatal(r.Run(":" + port))

}
