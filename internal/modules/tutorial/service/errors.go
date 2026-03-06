// Package service contains shared utilities for tutorial service layer.
package service

import (
	"errors"
	"fmt"

	sharedRepo "github.com/julianstephens/formation/internal/repo"
	sharedService "github.com/julianstephens/formation/internal/service"
)

// ValidationError is re-exported from shared service for convenience.
type ValidationError = sharedService.ValidationError

// NotFoundError is re-exported from shared service for convenience.
type NotFoundError = sharedService.NotFoundError

// wrapNotFound converts a repo.ErrNotFound into a NotFoundError with context.
func wrapNotFound(err error, resource, id string) error {
	if errors.Is(err, sharedRepo.ErrNotFound) {
		return &NotFoundError{Resource: resource, ID: id}
	}
	return fmt.Errorf("%s %s: %w", resource, id, err)
}

// ErrSessionTerminalError signals that the session is in a terminal state.
type ErrSessionTerminalError struct {
	Status string
}

func (e *ErrSessionTerminalError) Error() string {
	return fmt.Sprintf("session is %s and no longer accepts turns", e.Status)
}
