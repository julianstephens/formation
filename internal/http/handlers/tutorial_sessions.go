package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/julianstephens/formation/internal/auth"
	"github.com/julianstephens/formation/internal/domain"
	apphttp "github.com/julianstephens/formation/internal/http"
	"github.com/julianstephens/formation/internal/service"
)

// TutorialSessionHandler exposes top-level tutorial session routes.
type TutorialSessionHandler struct {
	sessionSvc  *service.TutorialSessionService
	artifactSvc *service.ArtifactService
}

// NewTutorialSessionHandler constructs a TutorialSessionHandler.
func NewTutorialSessionHandler(
	sessionSvc *service.TutorialSessionService,
	artifactSvc *service.ArtifactService,
) *TutorialSessionHandler {
	return &TutorialSessionHandler{
		sessionSvc:  sessionSvc,
		artifactSvc: artifactSvc,
	}
}

// ── Route registration ─────────────────────────────────────────────────────────

// Register wires top-level tutorial session routes onto the provided router group.
// Expected prefix: /v1/tutorial-sessions
func (h *TutorialSessionHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/:id", h.Get)
	rg.DELETE("/:id", h.Delete)
	rg.POST("/:id/complete", h.Complete)
	rg.POST("/:id/abandon", h.Abandon)
	rg.GET("/:id/artifacts", h.ListArtifacts)
	rg.POST("/:id/artifacts", h.CreateArtifact)
	rg.DELETE("/:id/artifacts/:artifactId", h.DeleteArtifact)
}

// ── Session Handlers ───────────────────────────────────────────────────────────

// Get godoc
//
//	@Summary  Get a tutorial session with its artifacts
//	@Tags     tutorial-sessions
//	@Produce  json
//	@Param    id   path      string  true  "Session ID"
//	@Success  200  {object}  apphttp.TutorialSessionDetailResponse
//	@Router   /v1/tutorial-sessions/{id} [get]
func (h *TutorialSessionHandler) Get(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	detail, err := h.sessionSvc.GetTutorialSession(c.Request.Context(), c.Param("id"), ownerSub)
	if err != nil {
		handleServiceError(c, err)
		return
	}

	artifacts := make([]apphttp.ArtifactResponse, len(detail.Artifacts))
	for i, a := range detail.Artifacts {
		artifacts[i] = toArtifactResponse(a)
	}
	resp := apphttp.TutorialSessionDetailResponse{
		TutorialSessionResponse: toTutorialSessionResponse(*detail.Session),
		Artifacts:               artifacts,
	}
	c.JSON(http.StatusOK, resp)
}

// Delete godoc
//
//	@Summary  Delete a tutorial session
//	@Tags     tutorial-sessions
//	@Param    id   path  string  true  "Session ID"
//	@Success  204
//	@Router   /v1/tutorial-sessions/{id} [delete]
func (h *TutorialSessionHandler) Delete(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	if err := h.sessionSvc.DeleteTutorialSession(c.Request.Context(), c.Param("id"), ownerSub); err != nil {
		handleServiceError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// Complete godoc
//
//	@Summary  Mark a tutorial session as complete
//	@Tags     tutorial-sessions
//	@Accept   json
//	@Produce  json
//	@Param    id    path      string                                    true   "Session ID"
//	@Param    body  body      apphttp.CompleteTutorialSessionRequest    false  "optional notes"
//	@Success  200   {object}  apphttp.TutorialSessionResponse
//	@Router   /v1/tutorial-sessions/{id}/complete [post]
func (h *TutorialSessionHandler) Complete(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	var req apphttp.CompleteTutorialSessionRequest
	// Notes are optional; ignore bind errors.
	_ = c.ShouldBindJSON(&req)

	sess, err := h.sessionSvc.CompleteTutorialSession(c.Request.Context(), c.Param("id"), ownerSub, req.Notes)
	if err != nil {
		handleTutorialSessionServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, toTutorialSessionResponse(*sess))
}

// Abandon godoc
//
//	@Summary  Abandon an in-progress tutorial session
//	@Tags     tutorial-sessions
//	@Produce  json
//	@Param    id   path      string  true  "Session ID"
//	@Success  200  {object}  apphttp.TutorialSessionResponse
//	@Router   /v1/tutorial-sessions/{id}/abandon [post]
func (h *TutorialSessionHandler) Abandon(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	sess, err := h.sessionSvc.AbandonTutorialSession(c.Request.Context(), c.Param("id"), ownerSub)
	if err != nil {
		handleTutorialSessionServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, toTutorialSessionResponse(*sess))
}

// ── Artifact Handlers ──────────────────────────────────────────────────────────

// ListArtifacts godoc
//
//	@Summary  List artifacts for a tutorial session
//	@Tags     artifacts
//	@Produce  json
//	@Param    id   path      string  true  "Session ID"
//	@Success  200  {array}   apphttp.ArtifactResponse
//	@Router   /v1/tutorial-sessions/{id}/artifacts [get]
func (h *TutorialSessionHandler) ListArtifacts(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	artifacts, err := h.artifactSvc.ListArtifacts(c.Request.Context(), c.Param("id"), ownerSub)
	if err != nil {
		handleServiceError(c, err)
		return
	}

	resp := make([]apphttp.ArtifactResponse, len(artifacts))
	for i, a := range artifacts {
		resp[i] = toArtifactResponse(a)
	}
	c.JSON(http.StatusOK, resp)
}

// CreateArtifact godoc
//
//	@Summary  Create an artifact for a tutorial session
//	@Tags     artifacts
//	@Accept   json
//	@Produce  json
//	@Param    id    path      string                        true  "Session ID"
//	@Param    body  body      apphttp.CreateArtifactRequest true  "artifact fields"
//	@Success  201   {object}  apphttp.ArtifactResponse
//	@Router   /v1/tutorial-sessions/{id}/artifacts [post]
func (h *TutorialSessionHandler) CreateArtifact(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	var req apphttp.CreateArtifactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apphttp.Fail(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}

	art, err := h.artifactSvc.CreateArtifact(c.Request.Context(), ownerSub, c.Param("id"), service.CreateArtifactParams{
		Kind:    domain.ArtifactKind(req.Kind),
		Title:   req.Title,
		Content: req.Content,
	})
	if err != nil {
		handleServiceError(c, err)
		return
	}

	c.JSON(http.StatusCreated, toArtifactResponse(*art))
}

// DeleteArtifact godoc
//
//	@Summary  Delete an artifact
//	@Tags     artifacts
//	@Param    id          path  string  true  "Session ID"
//	@Param    artifactId  path  string  true  "Artifact ID"
//	@Success  204
//	@Router   /v1/tutorial-sessions/{id}/artifacts/{artifactId} [delete]
func (h *TutorialSessionHandler) DeleteArtifact(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	if err := h.artifactSvc.DeleteArtifact(c.Request.Context(), c.Param("artifactId"), ownerSub); err != nil {
		handleServiceError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// ── helpers ────────────────────────────────────────────────────────────────────

// handleTutorialSessionServiceError maps tutorial-session-specific errors to HTTP codes.
func handleTutorialSessionServiceError(c *gin.Context, err error) {
	handleSessionServiceError(c, err)
}
