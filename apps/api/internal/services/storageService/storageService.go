package storage

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Service struct {
	Client        *s3.Client
	PresignClient *s3.PresignClient
	Bucket        string
}

func NewS3Service(client *s3.Client, bucket string) *S3Service {
	return &S3Service{
		Client:        client,
		PresignClient: s3.NewPresignClient(client),
		Bucket:        bucket,
	}
}

func (s *S3Service) UploadProjectFile(
	ctx context.Context,
	projectID string,
	file multipart.File,
	header *multipart.FileHeader,
	fileType string, // image | tex
) (objectKey string, size int64, err error) {

	ext := header.Filename

	objectKey = fmt.Sprintf(
		"%s/%s/%s",
		projectID,
		fileType,
		ext,
	)
	contentType := header.Header.Get("Content-Type")

	out, err := s.Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      &s.Bucket,
		Key:         &objectKey,
		Body:        file,
		ContentType: &contentType,
	})
	if err != nil {
		return "", 0, err
	}

	_ = out
	return objectKey, header.Size, nil
}
func (s *S3Service) GetSignedDownloadURL(
	ctx context.Context,
	objectKey string,
	expiry time.Duration,
) (string, error) {

	resp, err := s.PresignClient.PresignGetObject(
		ctx,
		&s3.GetObjectInput{
			Bucket: &s.Bucket,
			Key:    &objectKey,
		},
		func(opts *s3.PresignOptions) {
			opts.Expires = expiry
		},
	)
	if err != nil {
		return "", err
	}

	return resp.URL, nil
}

func (s *S3Service) StreamObject(
	ctx context.Context,
	objectKey string,
) (body io.ReadCloser, contentType *string, err error) {

	out, err := s.Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &s.Bucket,
		Key:    &objectKey,
	})
	if err != nil {
		return nil, nil, err
	}

	return out.Body, out.ContentType, nil
}
