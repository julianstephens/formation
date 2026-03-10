package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	svc "github.com/julianstephens/formation/internal/modules/tutorial/service"
	sharedSvc "github.com/julianstephens/formation/internal/service"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// newTestContext creates a minimal gin context backed by a response recorder.
func newTestContext() (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/test", nil)
	return c, w
}

// ── handleSessionServiceError ─────────────────────────────────────────────────

// TestHandleSessionServiceError_terminalMapsTo409 verifies that
// ErrSessionTerminalError is translated to HTTP 409 Conflict, not 500.
// This regression-tests the SubmitTurn and CreateArtifact handlers which
// previously used the generic handleServiceError that omitted this mapping.
func TestHandleSessionServiceError_terminalMapsTo409(t *testing.T) {
	t.Parallel()
	for _, status := range []string{"complete", "abandoned"} {
		status := status
		t.Run(status, func(t *testing.T) {
			t.Parallel()
			c, w := newTestContext()
			handleSessionServiceError(c, &svc.ErrSessionTerminalError{Status: status})
			if w.Code != http.StatusConflict {
				t.Errorf("ErrSessionTerminalError{Status:%q}: expected 409, got %d", status, w.Code)
			}
			var body map[string]any
			if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
				t.Fatalf("response body is not JSON: %v", err)
			}
			if body["error"] != "session_terminal" {
				t.Errorf("expected error=session_terminal, got %v", body["error"])
			}
		})
	}
}

// TestHandleSessionServiceError_notFoundMapsTo404 ensures the fallback delegating
// to the generic error handler still routes NotFoundError correctly.
func TestHandleSessionServiceError_notFoundMapsTo404(t *testing.T) {
	t.Parallel()
	c, w := newTestContext()
	handleSessionServiceError(c, &sharedSvc.NotFoundError{Resource: "tutorial_session", ID: "sess-1"})
	if w.Code != http.StatusNotFound {
		t.Errorf("NotFoundError: expected 404, got %d", w.Code)
	}
}

// TestHandleSessionServiceError_conflictMapsTo409 verifies that ConflictError
// (e.g., from the week-uniqueness check in CreateTutorialSession) also maps to 409.
func TestHandleSessionServiceError_conflictMapsTo409(t *testing.T) {
	t.Parallel()
	c, w := newTestContext()
	handleSessionServiceError(c, &sharedSvc.ConflictError{
		Resource: "tutorial_session",
		Message:  "an in-progress extended session already exists for this tutorial this week",
	})
	if w.Code != http.StatusConflict {
		t.Errorf("ConflictError: expected 409, got %d", w.Code)
	}
}
