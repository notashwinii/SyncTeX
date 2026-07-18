package db

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"
	"os"
)

func ConnectDB() *pgxpool.Pool {
	dbURI := os.Getenv("DB_URI")

	if dbURI == "" {
		log.Fatal("DB_URI environment variable not set")
	}

	config, err := pgxpool.ParseConfig(dbURI)
	if err != nil {
		log.Fatal("Unable to parse DB URI:", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatal("Unable to create connection pool:", err)
	}

	return pool

}
