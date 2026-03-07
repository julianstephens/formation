package http

import (
	"time"

	"github.com/gin-gonic/gin"
)

// APIError is the standard JSON error envelope returned by all v1 endpoints.
type APIError struct {
	Code      string    `json:"error"`
	Message   string    `json:"message"`
	Details   any       `json:"details,omitempty"`
	Path      string    `json:"path,omitempty"`
	RequestID string    `json:"request_id,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// Fail aborts the current request and writes a standard APIError response.
func Fail(c *gin.Context, status int, code, message string) {
	FailDetails(c, status, code, message, nil)
}

// FailDetails is like Fail but attaches arbitrary extra info in the "details" field.
func FailDetails(c *gin.Context, status int, code, message string, details any) {
	requestID, _ := c.Get("request_id")
	reqID, _ := requestID.(string)

	err := APIError{
		Code:      code,
		Message:   message,
		Details:   details,
		Path:      c.Request.URL.Path,
		RequestID: reqID,
		Timestamp: time.Now().UTC(),
	}
	c.AbortWithStatusJSON(status, err)
}
