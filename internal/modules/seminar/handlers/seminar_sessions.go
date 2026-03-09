package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/julianstephens/formation/internal/auth"
	"github.com/julianstephens/formation/internal/domain"
	apphttp "github.com/julianstephens/formation/internal/http"
	"github.com/julianstephens/formation/internal/modules/seminar/service"
	"github.com/julianstephens/formation/internal/observability"
)

// SessionHandler exposes session-related routes.
type SeminarSessionHandler struct {
	svc *service.SeminarSessionService
}

// NewSessionHandler constructs a SessionHandler backed by the given service.
func NewSeminarSessionHandler(svc *service.SeminarSessionService) *SeminarSessionHandler {
	return &SeminarSessionHandler{svc: svc}
}

// ── Route registration ─────────────────────────────────────────────────────────

// RegisterUnderSeminar wires the session-creation route onto the seminars group.
// Expected prefix: /v1/seminars/:id
func (h *SeminarSessionHandler) RegisterUnderSeminar(rg *gin.RouterGroup) {
	rg.GET("/:id/sessions", h.List)
	rg.POST("/:id/sessions", h.Create)
}

// Register wires top-level session routes onto the provided router group.
// Expected prefix: /v1/sessions
func (h *SeminarSessionHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/:id", h.Get)
	rg.DELETE("/:id", h.Delete)
	rg.POST("/:id/abandon", h.Abandon)
	rg.POST("/:id/residue", h.SubmitResidue)
}

// ── Handlers ───────────────────────────────────────────────────────────────────

// Create godoc
//
//	@Summary  Create a session for a seminar
//	@Tags     sessions
//	@Accept   json
//	@Produce  json
//	@Param    id    path      string                          true  "Seminar ID"
//	@Param    body  body      apphttp.CreateSeminarSessionRequest    true  "session fields"
//	@Success  201   {object}  apphttp.SeminarSessionResponse
//	@Router   /v1/seminars/{id}/sessions [post]
func (h *SeminarSessionHandler) Create(c *gin.Context) {
	logger := observability.FromGinCtx(c)
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	seminarID := c.Param("id")
	logger.Debug("creating session", slog.String("seminar_id", seminarID))

	var req apphttp.CreateSeminarSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Debug("invalid request body", slog.String("error", err.Error()))
		apphttp.FailDetails(c, http.StatusBadRequest, "invalid_request",
			"The request body is invalid or missing required fields",
			gin.H{"error": err.Error()})
		return
	}

	sess, err := h.svc.Create(c.Request.Context(), ownerSub, seminarID, service.CreateSeminarSessionParams{
		SectionLabel: req.SectionLabel,
		Mode:         req.Mode,
		ExcerptText:  req.ExcerptText,
		ReconMinutes: req.ReconMinutes,
	})
	if err != nil {
		handleSeminarSessionServiceError(c, err)
		return
	}

	logger.Debug("session created successfully", slog.String("session_id", sess.ID))
	c.JSON(http.StatusCreated, toSeminarSessionResponse(*sess))
}

// List godoc
//
//	@Summary  List sessions for a seminar
//	@Tags     sessions
//	@Produce  json
//	@Param    id   path      string  true  "Seminar ID"
//	@Success  200  {array}   apphttp.SeminarSessionResponse
//	@Router   /v1/seminars/{id}/sessions [get]
func (h *SeminarSessionHandler) List(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	sessions, err := h.svc.List(c.Request.Context(), c.Param("id"), ownerSub)
	if err != nil {
		handleSeminarSessionServiceError(c, err)
		return
	}

	responses := make([]apphttp.SeminarSessionResponse, len(sessions))
	for i, s := range sessions {
		responses[i] = toSeminarSessionResponse(s)
	}
	c.JSON(http.StatusOK, responses)
}

// Delete godoc
//
//	@Summary  Delete a session
//	@Tags     sessions
//	@Param    id   path      string  true  "Session ID"
//	@Success  204
//	@Router   /v1/sessions/{id} [delete]
func (h *SeminarSessionHandler) Delete(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	err = h.svc.Delete(c.Request.Context(), c.Param("id"), ownerSub)
	if err != nil {
		handleSeminarSessionServiceError(c, err)
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// Get godoc
//
//	@Summary  Get a session with its turns
//	@Tags     sessions
//	@Produce  json
//	@Param    id   path      string  true  "Session ID"
//	@Success  200  {object}  apphttp.SeminarSessionDetailResponse
//	@Router   /v1/sessions/{id} [get]
func (h *SeminarSessionHandler) Get(c *gin.Context) {
	logger := observability.FromGinCtx(c)
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	sessionID := c.Param("id")
	logger.Debug("fetching session", slog.String("session_id", sessionID))

	detail, err := h.svc.Get(c.Request.Context(), sessionID, ownerSub)
	if err != nil {
		handleSeminarSessionServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, toSeminarSessionDetailResponse(detail))
}

// Abandon godoc
//
//	@Summary  Abandon an in-progress session
//	@Tags     sessions
//	@Produce  json
//	@Param    id   path      string  true  "Session ID"
//	@Success  200  {object}  apphttp.SeminarSessionResponse
//	@Router   /v1/sessions/{id}/abandon [post]
func (h *SeminarSessionHandler) Abandon(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	sess, err := h.svc.Abandon(c.Request.Context(), c.Param("id"), ownerSub)
	if err != nil {
		handleSeminarSessionServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, toSeminarSessionResponse(*sess))
}

// SubmitResidue godoc
//
//	@Summary  Submit residue text to complete a session
//	@Tags     sessions
//	@Accept   json
//	@Produce  json
//	@Param    id    path      string                        true  "Session ID"
//	@Param    body  body      apphttp.SubmitResidueRequest  true  "residue text"
//	@Success  200   {object}  apphttp.SeminarSessionResponse
//	@Router   /v1/sessions/{id}/residue [post]
func (h *SeminarSessionHandler) SubmitResidue(c *gin.Context) {
	ownerSub, err := auth.MustOwnerSub(c)
	if err != nil {
		return
	}

	var req apphttp.SubmitResidueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apphttp.Fail(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}

	sess, err := h.svc.SubmitResidue(c.Request.Context(), c.Param("id"), ownerSub, req.ResidueText)
	if err != nil {
		handleSeminarSessionServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, toSeminarSessionResponse(*sess))
}

// ── helpers ────────────────────────────────────────────────────────────────────

// toSessionResponse converts a domain.SeminarSession to its HTTP response shape.
func toSeminarSessionResponse(s domain.SeminarSession) apphttp.SeminarSessionResponse {
	return apphttp.SeminarSessionResponse{
		ID:             s.ID,
		SeminarID:      s.SeminarID,
		SectionLabel:   s.SectionLabel,
		Mode:           s.Mode,
		ExcerptText:    s.ExcerptText,
		ExcerptHash:    s.ExcerptHash,
		Status:         s.Status,
		Phase:          s.Phase,
		ReconMinutes:   s.ReconMinutes,
		PhaseStartedAt: s.PhaseStartedAt,
		PhaseEndsAt:    s.PhaseEndsAt,
		StartedAt:      s.StartedAt,
		EndedAt:        s.EndedAt,
		ResidueText:    s.ResidueText,
	}
}

// toTurnResponse converts a domain.SeminarTurn to its HTTP response shape.
func toSeminarTurnResponse(t domain.SeminarTurn) apphttp.SeminarTurnResponse {
	return apphttp.SeminarTurnResponse{
		ID:        t.ID,
		SessionID: t.SessionID,
		Phase:     t.Phase,
		Speaker:   t.Speaker,
		Text:      t.Text,
		Flags:     t.Flags,
		CreatedAt: t.CreatedAt,
	}
}

// toSessionDetailResponse converts a SessionDetail to its HTTP response shape.
func toSeminarSessionDetailResponse(d *service.SeminarSessionDetail) apphttp.SeminarSessionDetailResponse {
	turns := make([]apphttp.SeminarTurnResponse, len(d.Turns))
	for i, t := range d.Turns {
		turns[i] = toSeminarTurnResponse(t)
	}
	return apphttp.SeminarSessionDetailResponse{
		SeminarSessionResponse: toSeminarSessionResponse(*d.Session),
		Turns:                  turns,
	}
}

// handleSessionServiceError extends handleServiceError with session-specific
// typed errors.
func handleSeminarSessionServiceError(c *gin.Context, err error) {
	var terminal *service.ErrSeminarSessionTerminalError
	if errors.As(err, &terminal) {
		apphttp.FailDetails(c, http.StatusConflict, "session_terminal",
			"This session has ended and no longer accepts new turns",
			gin.H{
				"status": terminal.Status,
			})
		return
	}

	var phaseExpired *service.ErrPhaseExpiredError
	if errors.As(err, &phaseExpired) {
		apphttp.FailDetails(c, http.StatusUnprocessableEntity, "phase_expired",
			"The time limit for this phase has been exceeded",
			gin.H{
				"phase": phaseExpired.Phase,
			})
		return
	}

	var phaseNoTurns *service.ErrPhaseNoTurnsError
	if errors.As(err, &phaseNoTurns) {
		apphttp.FailDetails(c, http.StatusUnprocessableEntity, "phase_no_turns",
			"This session phase does not accept user-submitted turns",
			gin.H{
				"phase": phaseNoTurns.Phase,
			})
		return
	}

	// Fall back to the seminar error handler which covers NotFound and Validation.
	handleServiceError(c, err)
}
