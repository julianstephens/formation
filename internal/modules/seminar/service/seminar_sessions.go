package service

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log/slog"
	"strings"
	"time"
	"unicode"

	"github.com/julianstephens/formation/internal/domain"
	"github.com/julianstephens/formation/internal/modules/seminar/repo"
	"github.com/julianstephens/formation/internal/observability"
)

// SessionService implements all business operations for sessions.
type SeminarSessionService struct {
	sessions *repo.SeminarSessionRepo
	seminars *repo.SeminarRepo
}

// NewSessionService constructs a SessionService backed by the given repositories.
func NewSeminarSessionService(sessions *repo.SeminarSessionRepo, seminars *repo.SeminarRepo) *SeminarSessionService {
	return &SeminarSessionService{sessions: sessions, seminars: seminars}
}

// ── Create ─────────────────────────────────────────────────────────────────────

// CreateSessionParams holds all caller-supplied fields for creating a session.
// Zero-value Mode and ReconMinutes fall back to the seminar's configured defaults.
type CreateSeminarSessionParams struct {
	SectionLabel    string
	WorkingQuestion string
	Mode            string // optional; falls back to seminar.DefaultMode
	ExcerptText     string // required when mode == "excerpt"
	ReconMinutes    int    // optional; falls back to seminar.DefaultReconMinutes
}

// Create validates params, inherits seminar defaults, and persists a new
// session owned by ownerSub. The initial phase is reconstruction and the
// phase timer is started immediately.
func (s *SeminarSessionService) Create(
	ctx context.Context,
	ownerSub, seminarID string,
	p CreateSeminarSessionParams,
) (*domain.SeminarSession, error) {
	logger := observability.LoggerFromContext(ctx)
	logger.Debug("creating session",
		slog.String("owner", ownerSub),
		slog.String("seminar_id", seminarID),
		slog.String("section", p.SectionLabel),
		slog.String("mode", p.Mode),
	)

	if strings.TrimSpace(p.SectionLabel) == "" {
		logger.Debug("validation failed: blank section label")
		return nil, &ValidationError{Field: "section_label", Message: "must not be blank"}
	}

	if strings.TrimSpace(p.WorkingQuestion) == "" {
		logger.Debug("validation failed: blank working question")
		return nil, &ValidationError{Field: "working_question", Message: "must not be blank"}
	}

	// Verify seminar ownership and retrieve defaults.
	sem, err := s.seminars.GetByID(ctx, seminarID, ownerSub)
	if err != nil {
		logger.Debug("seminar not found", slog.String("seminar_id", seminarID), slog.String("error", err.Error()))
		return nil, wrapNotFound(err, "seminar", seminarID)
	}

	// Apply seminar defaults for omitted fields.
	if p.Mode == "" {
		p.Mode = sem.DefaultMode
	}
	if p.ReconMinutes == 0 {
		p.ReconMinutes = sem.DefaultReconMinutes
	}

	if !validModes[p.Mode] {
		logger.Debug("invalid mode", slog.String("mode", p.Mode))
		return nil, &ValidationError{Field: "mode", Message: "must be 'paperback' or 'excerpt'"}
	}
	if p.Mode == "excerpt" && strings.TrimSpace(p.ExcerptText) == "" {
		logger.Debug("excerpt mode requires excerpt text")
		return nil, &ValidationError{Field: "excerpt_text", Message: "required when mode is 'excerpt'"}
	}
	if p.ReconMinutes < 15 || p.ReconMinutes > 20 {
		logger.Debug("invalid recon minutes", slog.Int("minutes", p.ReconMinutes))
		return nil, &ValidationError{Field: "recon_minutes", Message: "must be between 15 and 20"}
	}

	now := time.Now().UTC()
	sess := domain.SeminarSession{
		SeminarID:       seminarID,
		SectionLabel:    p.SectionLabel,
		WorkingQuestion: p.WorkingQuestion,
		Mode:            p.Mode,
		ExcerptText:     p.ExcerptText,
		ExcerptHash:     excerptHash(p.ExcerptText),
		ReconMinutes:    p.ReconMinutes,
		PhaseStartedAt:  now,
		PhaseEndsAt:     now.Add(time.Duration(p.ReconMinutes) * time.Minute),
	}

	created, err := s.sessions.Create(ctx, ownerSub, sess)
	if err != nil {
		logger.Error("failed to create session", slog.String("error", err.Error()))
		return nil, fmt.Errorf("create session: %w", err)
	}
	logger.Debug("session created",
		slog.String("id", created.ID),
		slog.String("phase", string(created.Phase)),
		slog.Time("phase_ends_at", created.PhaseEndsAt),
	)
	return created, nil
}

// ── Get ────────────────────────────────────────────────────────────────────────

// SessionDetail wraps a session with its ordered turn list.
type SeminarSessionDetail struct {
	Session *domain.SeminarSession
	Turns   []domain.SeminarTurn
}

// Get returns the session and its turns if owned by ownerSub.
func (s *SeminarSessionService) Get(ctx context.Context, id, ownerSub string) (*SeminarSessionDetail, error) {
	logger := observability.LoggerFromContext(ctx)
	logger.Debug("fetching session", slog.String("id", id), slog.String("owner", ownerSub))

	sess, err := s.sessions.GetByID(ctx, id, ownerSub)
	if err != nil {
		logger.Debug("session not found", slog.String("id", id), slog.String("error", err.Error()))
		return nil, wrapNotFound(err, "session", id)
	}

	turns, err := s.sessions.ListTurns(ctx, id, ownerSub)
	if err != nil {
		logger.Error("failed to fetch session turns", slog.String("id", id), slog.String("error", err.Error()))
		return nil, fmt.Errorf("get session turns: %w", err)
	}

	logger.Debug("session fetched",
		slog.String("id", id),
		slog.String("phase", string(sess.Phase)),
		slog.Int("turn_count", len(turns)),
	)
	return &SeminarSessionDetail{Session: sess, Turns: turns}, nil
}

// ── List ───────────────────────────────────────────────────────────────────────

// List returns all sessions for a seminar in reverse-chronological order.
func (s *SeminarSessionService) List(ctx context.Context, seminarID, ownerSub string) ([]domain.SeminarSession, error) {
	sessions, err := s.sessions.ListBySeminarID(ctx, seminarID, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	return sessions, nil
}

// ── Delete ─────────────────────────────────────────────────────────────────────

// Delete removes a session and all its associated turns.
// Returns NotFoundError if the session does not exist or is not owned by ownerSub.
func (s *SeminarSessionService) Delete(ctx context.Context, id, ownerSub string) error {
	err := s.sessions.Delete(ctx, id, ownerSub)
	if err != nil {
		return wrapNotFound(err, "session", id)
	}
	return nil
}

// ── Abandon ────────────────────────────────────────────────────────────────────

// Abandon transitions an in-progress session to abandoned status.
// Returns NotFoundError if the session does not exist.
// Returns ErrSessionTerminalError if the session is already terminal.
func (s *SeminarSessionService) Abandon(ctx context.Context, id, ownerSub string) (*domain.SeminarSession, error) {
	logger := observability.LoggerFromContext(ctx)
	logger.Debug("abandoning session", slog.String("id", id), slog.String("owner", ownerSub))

	// Fetch to distinguish "not found" from "already terminal".
	existing, err := s.sessions.GetByID(ctx, id, ownerSub)
	if err != nil {
		logger.Debug("session not found for abandon", slog.String("id", id), slog.String("error", err.Error()))
		return nil, wrapNotFound(err, "session", id)
	}
	if existing.IsTerminal() {
		logger.Debug("session already terminal", slog.String("id", id), slog.String("status", string(existing.Status)))
		return nil, &ErrSeminarSessionTerminalError{Status: existing.Status}
	}

	sess, err := s.sessions.Abandon(ctx, id, ownerSub)
	if err != nil {
		logger.Error("failed to abandon session", slog.String("id", id), slog.String("error", err.Error()))
		return nil, wrapNotFound(err, "session", id)
	}
	logger.Debug("session abandoned", slog.String("id", id))
	return sess, nil
}

// ── Residue ────────────────────────────────────────────────────────────────────

// SubmitResidue validates the residue text and, if acceptable, stores it on the
// session and advances it to done/complete. The session must be in the
// residue_required phase.
func (s *SeminarSessionService) SubmitResidue(
	ctx context.Context,
	id, ownerSub, residueText string,
) (*domain.SeminarSession, error) {
	logger := observability.LoggerFromContext(ctx)
	logger.Debug("submitting residue", slog.String("id", id), slog.Int("text_length", len(residueText)))

	if err := validateResidue(residueText); err != nil {
		logger.Debug("residue validation failed", slog.String("error", err.Error()))
		return nil, err
	}

	sess, err := s.sessions.SetResidue(ctx, id, ownerSub, residueText)
	if err != nil {
		logger.Error("failed to set residue", slog.String("id", id), slog.String("error", err.Error()))
		// ErrNotFound is returned by the repo when the UPDATE affects 0 rows,
		// which happens when the session is not in residue_required phase, is
		// already terminal, or belongs to a different owner.
		return nil, wrapNotFound(err, "session", id)
	}
	logger.Debug("residue submitted", slog.String("id", id))
	return sess, nil
}

// ── Turn-submission guard ──────────────────────────────────────────────────────

// AssertTurnAllowed returns a typed error if the session cannot accept a new
// user turn right now. The turn pipeline (step 8) calls this before processing.
//
// Rules enforced:
//  1. Session must not be terminal (complete or abandoned).
//  2. Phase must permit turns (reconstruction, opposition, reversal).
//  3. The phase timer must not have elapsed.
func AssertTurnAllowed(sess *domain.SeminarSession) error {
	if sess.IsTerminal() {
		return &ErrSeminarSessionTerminalError{Status: sess.Status}
	}
	if !sess.PhaseAllowsTurns() {
		return &ErrPhaseNoTurnsError{Phase: sess.Phase}
	}
	if sess.IsPhaseExpired() {
		return &ErrPhaseExpiredError{Phase: sess.Phase}
	}
	return nil
}

// ── helpers ────────────────────────────────────────────────────────────────────

// residueComponentKeywords are word lists used for heuristic component detection.
// A valid residue must contain at least one explicit marker for each component.
var residueComponentKeywords = map[string][]string{
	"thesis": {"thesis", "argument", "claim", "position", "contends", "asserts", "proposes", "argues"},
	"objection": {
		"objection",
		"objects",
		"counter",
		"challenge",
		"critique",
		"however",
		"disagrees",
		"rejects",
		"disputes",
	},
	"tension": {
		"tension",
		"conflict",
		"contradiction",
		"paradox",
		"unresolved",
		"unclear",
		"ambiguous",
		"problematic",
		"difficulty",
	},
}

// validateResidue applies heuristic checks to residue text.
// Requirements: at least 5 sentences, and presence of thesis, objection,
// and tension component markers.
func validateResidue(text string) error {
	text = strings.TrimSpace(text)
	if text == "" {
		return &ValidationError{Field: "residue_text", Message: "must not be blank"}
	}

	// Count sentence boundaries (., !, ?).
	sentences := countSentences(text)
	if sentences < 5 {
		return &ValidationError{
			Field:   "residue_text",
			Message: fmt.Sprintf("must contain at least 5 sentences (found %d)", sentences),
		}
	}

	lower := strings.ToLower(text)
	for component, keywords := range residueComponentKeywords {
		found := false
		for _, kw := range keywords {
			if strings.Contains(lower, kw) {
				found = true
				break
			}
		}
		if !found {
			return &ValidationError{
				Field:   "residue_text",
				Message: fmt.Sprintf("must address the %s component", component),
			}
		}
	}
	return nil
}

// countSentences counts sentence-ending punctuation tokens in text.
// Consecutive punctuation (e.g. "...") counts as one boundary.
func countSentences(text string) int {
	count := 0
	inBoundary := false
	for _, r := range text {
		if r == '.' || r == '!' || r == '?' {
			if !inBoundary {
				count++
				inBoundary = true
			}
		} else if !unicode.IsSpace(r) {
			inBoundary = false
		}
	}
	return count
}

// excerptHash computes a hex-encoded SHA-256 digest of the excerpt text.
// Returns an empty string for an empty excerpt.
func excerptHash(text string) string {
	if text == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(text))
	return fmt.Sprintf("%x", sum)
}
