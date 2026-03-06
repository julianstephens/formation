// Package storage provides an S3-compatible object storage client used for
// uploading export files and generating presigned download URLs.
package storage

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/julianstephens/formation/internal/config"
)

// PresignExpiry is the lifetime of a presigned download URL.
const PresignExpiry = 15 * time.Minute

// S3Client wraps the AWS S3 client and presign client with the configured
// bucket name so callers do not need to pass the bucket on every call.
type S3Client struct {
	client  *s3.Client
	presign *s3.PresignClient
	bucket  string
}

// NewS3Client constructs an S3Client from application configuration.
// It configures a custom endpoint URL to support S3-compatible services such
// as Garage or MinIO.
func NewS3Client(cfg *config.Config) *S3Client {
	creds := credentials.NewStaticCredentialsProvider(
		cfg.S3AccessKeyID,
		cfg.S3SecretKey,
		"",
	)

	client := s3.New(s3.Options{
		BaseEndpoint:       aws.String(cfg.S3EndpointURL),
		Credentials:        creds,
		Region:             cfg.S3Region,
		UsePathStyle:       true,
	})

	return &S3Client{
		client:  client,
		presign: s3.NewPresignClient(client),
		bucket:  cfg.S3BucketName,
	}
}

// Upload puts content into the bucket under key with the given content type.
// Returns an error if the upload fails.
func (c *S3Client) Upload(ctx context.Context, key string, content []byte, contentType string) error {
	_, err := c.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(content),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return fmt.Errorf("s3 upload %q: %w", key, err)
	}
	return nil
}

// PresignURL returns a presigned GET URL for the given object key that is
// valid for PresignExpiry.
func (c *S3Client) PresignURL(ctx context.Context, key string) (string, error) {
	req, err := c.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(PresignExpiry))
	if err != nil {
		return "", fmt.Errorf("s3 presign %q: %w", key, err)
	}
	return req.URL, nil
}
