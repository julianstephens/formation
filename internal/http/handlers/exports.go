package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/julianstephens/formation/internal/auth"
	"github.com/julianstephens/formation/internal/export"
	apphttp "github.com/julianstephens/formation/internal/http"
	"github.com/julianstephens/formation/internal/service"
)

// ExportHandler serves seminar and session export endpoints.
// Both handlers accept an optional ?format query parameter:
//
//	format=json (default) → application/json
//	format=md             → text/markdown
type ExportHandler struct {
	svc *service.ExportService
}

// NewExportHandler constructs an ExportHandler backed by the given service.
func NewExportHandler(svc *service.ExportService) *ExportHandler {
	return &ExportHandler{svc: svc}
}

// RegisterUnderSeminars mounts GET /:id/export on the seminars router group.
func (h *ExportHandler) RegisterUnderSeminars(rg *gin.RouterGroup) {
	rg.GET("/:id/export", h.ExportSeminar)
}

// RegisterUnderSessions mounts GET /:id/export on the sessions router group.
func (h *ExportHandler) RegisterUnderSessions(rg *gin.RouterGroup) {
	rg.GET("/:id/export", h.ExportSession)
}

// RegisterUnderTutorials mounts GET /:id/export on the tutorials router group.
func (h *ExportHandler) RegisterUnderTutorials(rg *gin.RouterGroup) {
	rg.GET("/:id/export", h.ExportTutorial)
}

// RegisterUnderTutorialSessions mounts GET /:id/export on the tutorial-sessions router group.
func (h *ExportHandler) RegisterUnderTutorialSessions(rg *gin.RouterGroup) {
	rg.GET("/:id/export", h.ExportTutorialSession)
}

// ── Handlers ───────────────────────────────────────────────────────────────────

// ExportSeminar godoc
//
//	@Summary  Export a full seminar
//	@Tags     exports
//	@Produce  json
//	@Param    id      path   string  true   "seminar ID"
//	@Param    format  query  string  false  "output format: json (default) or md"
//	@Success  200
//	@Router   /v1/seminars/{id}/export [get]
func (h *ExportHandler) ExportSeminar(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}
	id := c.Param("id")

	result, err := h.svc.ExportSeminar(c.Request.Context(), id, ownerSub)
	if err != nil {
		writeExportError(c, err)
		return
	}

	switch c.DefaultQuery("format", "json") {
	case "md":
		body := export.RenderSeminarMarkdown(result)
		c.Header("Content-Disposition",
			fmt.Sprintf(`attachment; filename="seminar-%s.md"`, id))
		c.Data(http.StatusOK, "text/markdown; charset=utf-8", body)
	default:
		body, err := export.RenderSeminarJSON(result)
		if err != nil {
			apphttp.Fail(c, http.StatusInternalServerError, "render_error", "failed to render JSON export")
			return
		}
		c.Header("Content-Disposition",
			fmt.Sprintf(`attachment; filename="seminar-%s.json"`, id))
		c.Data(http.StatusOK, "application/json; charset=utf-8", body)
	}
}

// ExportSession godoc
//
//	@Summary  Export a session transcript
//	@Tags     exports
//	@Produce  json
//	@Param    id      path   string  true   "session ID"
//	@Param    format  query  string  false  "output format: json (default) or md"
//	@Success  200
//	@Router   /v1/sessions/{id}/export [get]
func (h *ExportHandler) ExportSession(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}
	id := c.Param("id")

	result, err := h.svc.ExportSession(c.Request.Context(), id, ownerSub)
	if err != nil {
		writeExportError(c, err)
		return
	}

	switch c.DefaultQuery("format", "json") {
	case "md":
		body := export.RenderSessionMarkdown(result)
		c.Header("Content-Disposition",
			fmt.Sprintf(`attachment; filename="session-%s.md"`, id))
		c.Data(http.StatusOK, "text/markdown; charset=utf-8", body)
	default:
		body, err := export.RenderSessionJSON(result)
		if err != nil {
			apphttp.Fail(c, http.StatusInternalServerError, "render_error", "failed to render JSON export")
			return
		}
		c.Header("Content-Disposition",
			fmt.Sprintf(`attachment; filename="session-%s.json"`, id))
		c.Data(http.StatusOK, "application/json; charset=utf-8", body)
	}
}

// ExportTutorial godoc
//
//	@Summary  Export a full tutorial
//	@Tags     exports
//	@Produce  json
//	@Param    id      path   string  true   "tutorial ID"
//	@Param    format  query  string  false  "output format: json (default) or md"
//	@Success  200
//	@Router   /v1/tutorials/{id}/export [get]
func (h *ExportHandler) ExportTutorial(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}
	id := c.Param("id")

	result, err := h.svc.ExportTutorial(c.Request.Context(), id, ownerSub)
	if err != nil {
		writeExportError(c, err)
		return
	}

	switch c.DefaultQuery("format", "json") {
	case "md":
		body := export.RenderTutorialMarkdown(result)
		c.Header("Content-Disposition",
			fmt.Sprintf(`attachment; filename="tutorial-%s.md"`, id))
		c.Data(http.StatusOK, "text/markdown; charset=utf-8", body)
	default:
		body, err := export.RenderTutorialJSON(result)
		if err != nil {
			apphttp.Fail(c, http.StatusInternalServerError, "render_error", "failed to render JSON export")
			return
		}
		c.Header("Content-Disposition",
			fmt.Sprintf(`attachment; filename="tutorial-%s.json"`, id))
		c.Data(http.StatusOK, "application/json; charset=utf-8", body)
	}
}

// ExportTutorialSession godoc
//
//	@Summary  Export a tutorial session transcript
//	@Tags     exports
//	@Produce  json
//	@Param    id      path   string  true   "tutorial session ID"
//	@Param    format  query  string  false  "output format: json (default) or md"
//	@Success  200
//	@Router   /v1/tutorial-sessions/{id}/export [get]
func (h *ExportHandler) ExportTutorialSession(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}
	id := c.Param("id")

	result, err := h.svc.ExportTutorialSession(c.Request.Context(), id, ownerSub)
	if err != nil {
		writeExportError(c, err)
		return
	}

	switch c.DefaultQuery("format", "json") {
	case "md":
		body := export.RenderTutorialSessionMarkdown(result)
		c.Header("Content-Disposition",
			fmt.Sprintf(`attachment; filename="tutorial-session-%s.md"`, id))
		c.Data(http.StatusOK, "text/markdown; charset=utf-8", body)
	default:
		body, err := export.RenderTutorialSessionJSON(result)
		if err != nil {
			apphttp.Fail(c, http.StatusInternalServerError, "render_error", "failed to render JSON export")
			return
		}
		c.Header("Content-Disposition",
			fmt.Sprintf(`attachment; filename="tutorial-session-%s.json"`, id))
		c.Data(http.StatusOK, "application/json; charset=utf-8", body)
	}
}

// ── helpers ───────────────────────────────────────────────────────────────────

func writeExportError(c *gin.Context, err error) {
	apphttp.HandleServiceError(c, err)
}
