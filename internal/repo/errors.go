package repo

import "errors"

// Sentinel errors returned by all repository methods.
// Handlers and services use errors.Is to translate these to HTTP status codes.
var (
	// ErrNotFound is returned when a row does not exist or fails an owner_sub check.
	ErrNotFound = errors.New("record not found")

	// ErrConflict is returned when an insert violates a uniqueness constraint.
	ErrConflict = errors.New("record already exists")
)
