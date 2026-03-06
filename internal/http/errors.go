// Package http contains shared HTTP infrastructure including error handling
// and response utilities.
package http

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/julianstephens/formation/internal/service"
)

// ErrorResponse represents an API error in the standard envelope format.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// HandleServiceError inspects a service error and translates it to an
// appropriate HTTP response. Returns true if an error was handled.
func HandleServiceError(c *gin.Context, err error) bool {
	if err == nil {
		return false
	}

	var validationErr *service.ValidationError
	if errors.As(err, &validationErr) {
		Fail(c, http.StatusBadRequest, "validation_error", validationErr.Error())
		return true
	}

	var notFoundErr *service.NotFoundError
	if errors.As(err, &notFoundErr) {
		Fail(c, http.StatusNotFound, "not_found", notFoundErr.Error())
		return true
	}

	// Unknown error - return 500
	Fail(c, http.StatusInternalServerError, "internal_error", "internal server error")
	return true
}
