// Package service contains shared service-layer infrastructure including
// validation and error handling utilities.
package service

import (
	"errors"
	"fmt"

	"github.com/julianstephens/formation/internal/repo"
)

// ValidationError represents a validation failure on a specific field.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// NotFoundError represents a resource that was not found or not accessible.
type NotFoundError struct {
	Resource string
	ID       string
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%s %q not found", e.Resource, e.ID)
}

// ConflictError represents a conflict with existing data (e.g., duplicate key).
type ConflictError struct {
	Resource string
	Field    string
	Value    string
	Message  string
}

func (e *ConflictError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return fmt.Sprintf("%s with %s=%q already exists", e.Resource, e.Field, e.Value)
}

// DatabaseError represents a database operation failure with context.
type DatabaseError struct {
	Operation string // e.g., "insert", "update", "delete", "query"
	Resource  string // e.g., "tutorial", "session"
	Err       error
}

func (e *DatabaseError) Error() string {
	return fmt.Sprintf("database %s failed for %s: %v", e.Operation, e.Resource, e.Err)
}

func (e *DatabaseError) Unwrap() error {
	return e.Err
}

// ExternalServiceError represents a failure when calling an external service.
type ExternalServiceError struct {
	Service string // e.g., "OpenAI", "S3"
	Action  string // e.g., "generate completion", "upload file"
	Err     error
}

func (e *ExternalServiceError) Error() string {
	return fmt.Sprintf("%s failed to %s: %v", e.Service, e.Action, e.Err)
}

func (e *ExternalServiceError) Unwrap() error {
	return e.Err
}

// WrapNotFound converts a repo.ErrNotFound into a NotFoundError with context.
// All other errors are passed through unchanged.
func WrapNotFound(err error, resource, id string) error {
	if errors.Is(err, repo.ErrNotFound) {
		return &NotFoundError{Resource: resource, ID: id}
	}
	return err
}
