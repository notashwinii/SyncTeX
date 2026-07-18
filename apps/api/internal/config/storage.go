package config

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func InitS3() *s3.Client {
	endpoint := os.Getenv("B2_ENDPOINT")
	accessKey := os.Getenv("B2_ACCESS_KEY")
	secretKey := os.Getenv("B2_SECRET_KEY")
	region := os.Getenv("B2_REGION")

	if endpoint == "" || accessKey == "" || secretKey == "" {
		log.Fatal("missing Backblaze S3 configuration")
	}

	cfg, err := config.LoadDefaultConfig(
		context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(
				accessKey,
				secretKey,
				"",
			),
		),
	)
	if err != nil {
		log.Fatal("failed to load AWS config:", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.EndpointResolver = s3.EndpointResolverFromURL(endpoint)
		o.UsePathStyle = true // REQUIRED for Backblaze
	})

	log.Println(" Connected to Backblaze S3")

	return client
}
