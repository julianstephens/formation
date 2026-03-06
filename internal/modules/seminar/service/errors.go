// Package service contains shared utilities for seminar service layer.
package service

import (
	"errors"
	"fmt"

	"github.com/julianstephens/formation/internal/domain"
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

// ErrSessionTerminalError signals that a session has ended and accepts no further turns.
type ErrSessionTerminalError struct {
	Status domain.SessionStatus
}

func (e *ErrSessionTerminalError) Error() string {
	return fmt.Sprintf("session is %s and no longer accepts turns", e.Status)
}

// ErrPhaseNoTurnsError signals that the current phase does not accept user turns.
type ErrPhaseNoTurnsError struct {
	Phase domain.SessionPhase
}

func (e *ErrPhaseNoTurnsError) Error() string {
	return fmt.Sprintf("phase %s does not accept user-submitted turns", e.Phase)
}

// ErrPhaseExpiredError signals that a turn was submitted after the phase timer elapsed.
type ErrPhaseExpiredError struct {
	Phase domain.SessionPhase
}

func (e *ErrPhaseExpiredError) Error() string {
	return fmt.Sprintf("phase %q has expired; wait for next phase", e.Phase)
}

// ErrSessionInvalidPhase signals an operation that's not allowed in the current phase.
var ErrSessionInvalidPhase = errors.New("session is not in the correct phase for this operation")
