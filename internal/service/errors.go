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

// WrapNotFound converts a repo.ErrNotFound into a NotFoundError with context.
// All other errors are passed through unchanged.
func WrapNotFound(err error, resource, id string) error {
	if errors.Is(err, repo.ErrNotFound) {
		return &NotFoundError{Resource: resource, ID: id}
	}
	return err
}
