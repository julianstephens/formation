package http

import "github.com/gin-gonic/gin"

// APIError is the standard JSON error envelope returned by all v1 endpoints.
type APIError struct {
	Code    string `json:"error"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

// Fail aborts the current request and writes a standard APIError response.
func Fail(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, APIError{Code: code, Message: message})
}

// FailDetails is like Fail but attaches arbitrary extra info in the "details" field.
func FailDetails(c *gin.Context, status int, code, message string, details any) {
	c.AbortWithStatusJSON(status, APIError{Code: code, Message: message, Details: details})
}
