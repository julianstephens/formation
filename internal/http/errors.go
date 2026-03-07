// Package http contains shared HTTP infrastructure including error handling
// and response utilities.
package http

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/julianstephens/formation/internal/service"
)

// ErrorResponse represents an API error in the standard envelope format.
// Deprecated: Use APIError instead.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// ValidationErrorDetail contains information about a specific validation failure.
type ValidationErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// HandleServiceError inspects a service error and translates it to an
// appropriate HTTP response with detailed information. Returns true if an error was handled.
func HandleServiceError(c *gin.Context, err error) bool {
	if err == nil {
		return false
	}

	var validationErr *service.ValidationError
	if errors.As(err, &validationErr) {
		FailDetails(c, http.StatusBadRequest, "validation_error",
			"The request contains invalid data",
			ValidationErrorDetail{
				Field:   validationErr.Field,
				Message: validationErr.Message,
			})
		return true
	}

	var notFoundErr *service.NotFoundError
	if errors.As(err, &notFoundErr) {
		FailDetails(c, http.StatusNotFound, "not_found",
			fmt.Sprintf("The requested %s was not found", notFoundErr.Resource),
			gin.H{
				"resource": notFoundErr.Resource,
				"id":       notFoundErr.ID,
			})
		return true
	}

	var conflictErr *service.ConflictError
	if errors.As(err, &conflictErr) {
		details := gin.H{
			"resource": conflictErr.Resource,
		}
		if conflictErr.Field != "" {
			details["field"] = conflictErr.Field
		}
		if conflictErr.Value != "" {
			details["value"] = conflictErr.Value
		}
		FailDetails(c, http.StatusConflict, "conflict",
			conflictErr.Error(),
			details)
		return true
	}

	var dbErr *service.DatabaseError
	if errors.As(err, &dbErr) {
		// Log the full error for debugging
		_ = c.Error(err)
		FailDetails(c, http.StatusInternalServerError, "database_error",
			fmt.Sprintf("Failed to %s %s. Please try again later", dbErr.Operation, dbErr.Resource),
			gin.H{
				"operation": dbErr.Operation,
				"resource":  dbErr.Resource,
			})
		return true
	}

	var extErr *service.ExternalServiceError
	if errors.As(err, &extErr) {
		// Log the full error for debugging
		_ = c.Error(err)
		FailDetails(c, http.StatusBadGateway, "external_service_error",
			"External service temporarily unavailable. Please try again later",
			gin.H{
				"service": extErr.Service,
				"action":  extErr.Action,
			})
		return true
	}

	// Log the actual error for debugging but don't expose internal details
	_ = c.Error(err)
	Fail(c, http.StatusInternalServerError, "internal_error",
		"An unexpected error occurred. Please try again or contact support if the problem persists")
	return true
}
