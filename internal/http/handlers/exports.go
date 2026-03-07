package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/julianstephens/formation/internal/auth"
	apphttp "github.com/julianstephens/formation/internal/http"
	"github.com/julianstephens/formation/internal/service"
)

// ExportHandler serves seminar and session export endpoints.
// Each handler uploads the rendered export to S3 and returns a presigned
// download URL as JSON: { "url": "..." }.
// An optional ?format query parameter controls the output format:
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
//	@Success  200  {object}  map[string]string
//	@Router   /v1/seminars/{id}/export [get]
func (h *ExportHandler) ExportSeminar(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}
	id := c.Param("id")
	format := c.DefaultQuery("format", "json")

	url, err := h.svc.UploadAndPresignSeminar(c.Request.Context(), id, ownerSub, format)
	if err != nil {
		writeExportError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// ExportSession godoc
//
//	@Summary  Export a session transcript
//	@Tags     exports
//	@Produce  json
//	@Param    id      path   string  true   "session ID"
//	@Param    format  query  string  false  "output format: json (default) or md"
//	@Success  200  {object}  map[string]string
//	@Router   /v1/sessions/{id}/export [get]
func (h *ExportHandler) ExportSession(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}
	id := c.Param("id")
	format := c.DefaultQuery("format", "json")

	url, err := h.svc.UploadAndPresignSession(c.Request.Context(), id, ownerSub, format)
	if err != nil {
		writeExportError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// ExportTutorial godoc
//
//	@Summary  Export a full tutorial
//	@Tags     exports
//	@Produce  json
//	@Param    id      path   string  true   "tutorial ID"
//	@Param    format  query  string  false  "output format: json (default) or md"
//	@Success  200  {object}  map[string]string
//	@Router   /v1/tutorials/{id}/export [get]
func (h *ExportHandler) ExportTutorial(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}
	id := c.Param("id")
	format := c.DefaultQuery("format", "json")

	url, err := h.svc.UploadAndPresignTutorial(c.Request.Context(), id, ownerSub, format)
	if err != nil {
		writeExportError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// ExportTutorialSession godoc
//
//	@Summary  Export a tutorial session transcript
//	@Tags     exports
//	@Produce  json
//	@Param    id      path   string  true   "tutorial session ID"
//	@Param    format  query  string  false  "output format: json (default) or md"
//	@Success  200  {object}  map[string]string
//	@Router   /v1/tutorial-sessions/{id}/export [get]
func (h *ExportHandler) ExportTutorialSession(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}
	id := c.Param("id")
	format := c.DefaultQuery("format", "json")

	url, err := h.svc.UploadAndPresignTutorialSession(c.Request.Context(), id, ownerSub, format)
	if err != nil {
		writeExportError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// ── helpers ───────────────────────────────────────────────────────────────────

func writeExportError(c *gin.Context, err error) {
	apphttp.HandleServiceError(c, err)
}
