package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/julianstephens/formation/internal/domain"
	"github.com/julianstephens/formation/internal/repo"
)

// validDifficulties is the exhaustive set of allowed tutorial difficulty levels.
var validDifficulties = map[string]bool{
	"beginner":     true,
	"intermediate": true,
	"advanced":     true,
}

// ── TutorialService ───────────────────────────────────────────────────────────

// TutorialService implements all business operations for tutorials.
type TutorialService struct {
	repo *repo.TutorialRepo
}

// NewTutorialService constructs a TutorialService backed by the given repository.
func NewTutorialService(r *repo.TutorialRepo) *TutorialService {
	return &TutorialService{repo: r}
}

// ── Tutorial Create ────────────────────────────────────────────────────────────

// CreateTutorialParams holds all caller-supplied fields for creating a tutorial.
type CreateTutorialParams struct {
	Title       string
	Subject     string
	Description string
	Difficulty  string
}

// CreateTutorial validates params and persists a new tutorial owned by ownerSub.
func (s *TutorialService) CreateTutorial(ctx context.Context, ownerSub string, p CreateTutorialParams) (*domain.Tutorial, error) {
	if strings.TrimSpace(p.Title) == "" {
		return nil, &ValidationError{Field: "title", Message: "must not be blank"}
	}
	if strings.TrimSpace(p.Subject) == "" {
		return nil, &ValidationError{Field: "subject", Message: "must not be blank"}
	}
	if p.Difficulty == "" {
		p.Difficulty = "beginner"
	}
	if !validDifficulties[p.Difficulty] {
		return nil, &ValidationError{Field: "difficulty", Message: "must be 'beginner', 'intermediate', or 'advanced'"}
	}

	tut := domain.Tutorial{
		Title:       p.Title,
		Subject:     p.Subject,
		Description: p.Description,
		Difficulty:  p.Difficulty,
	}
	return s.repo.CreateTutorial(ctx, ownerSub, tut)
}

// ── Tutorial Get ───────────────────────────────────────────────────────────────

// GetTutorial returns the tutorial with the given id if it is owned by ownerSub.
func (s *TutorialService) GetTutorial(ctx context.Context, id, ownerSub string) (*domain.Tutorial, error) {
	tut, err := s.repo.GetTutorialByID(ctx, id, ownerSub)
	if err != nil {
		return nil, wrapNotFound(err, "tutorial", id)
	}
	return tut, nil
}

// ── Tutorial List ──────────────────────────────────────────────────────────────

// ListTutorials returns all tutorials owned by ownerSub.
func (s *TutorialService) ListTutorials(ctx context.Context, ownerSub string) ([]domain.Tutorial, error) {
	tutorials, err := s.repo.ListTutorials(ctx, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("list tutorials: %w", err)
	}
	if tutorials == nil {
		tutorials = []domain.Tutorial{}
	}
	return tutorials, nil
}

// ── Tutorial Update ────────────────────────────────────────────────────────────

// UpdateTutorialParams holds all patchable tutorial fields; nil means "no change".
type UpdateTutorialParams struct {
	Title       *string
	Subject     *string
	Description *string
	Difficulty  *string
}

// UpdateTutorial applies a partial update to the tutorial and returns the updated record.
func (s *TutorialService) UpdateTutorial(ctx context.Context, id, ownerSub string, p UpdateTutorialParams) (*domain.Tutorial, error) {
	if p.Difficulty != nil && !validDifficulties[*p.Difficulty] {
		return nil, &ValidationError{Field: "difficulty", Message: "must be 'beginner', 'intermediate', or 'advanced'"}
	}
	patch := domain.TutorialPatch{
		Title:       p.Title,
		Subject:     p.Subject,
		Description: p.Description,
		Difficulty:  p.Difficulty,
	}
	tut, err := s.repo.UpdateTutorial(ctx, id, ownerSub, patch)
	if err != nil {
		return nil, wrapNotFound(err, "tutorial", id)
	}
	return tut, nil
}

// ── Tutorial Delete ────────────────────────────────────────────────────────────

// DeleteTutorial removes the tutorial. Returns NotFoundError if it does not
// exist or is owned by a different user.
func (s *TutorialService) DeleteTutorial(ctx context.Context, id, ownerSub string) error {
	if err := s.repo.DeleteTutorial(ctx, id, ownerSub); err != nil {
		return wrapNotFound(err, "tutorial", id)
	}
	return nil
}

// ── TutorialSessionService ────────────────────────────────────────────────────

// TutorialSessionService implements all business operations for tutorial sessions.
type TutorialSessionService struct {
	sessions  *repo.TutorialRepo
	tutorials *repo.TutorialRepo
}

// NewTutorialSessionService constructs a TutorialSessionService backed by the given repository.
func NewTutorialSessionService(r *repo.TutorialRepo) *TutorialSessionService {
	return &TutorialSessionService{sessions: r, tutorials: r}
}

// ── Session Create ─────────────────────────────────────────────────────────────

// CreateTutorialSession creates a new in-progress tutorial session under tutorialID.
func (s *TutorialSessionService) CreateTutorialSession(
	ctx context.Context,
	ownerSub, tutorialID string,
) (*domain.TutorialSession, error) {
	// Verify tutorial ownership.
	if _, err := s.tutorials.GetTutorialByID(ctx, tutorialID, ownerSub); err != nil {
		return nil, wrapNotFound(err, "tutorial", tutorialID)
	}

	sess := domain.TutorialSession{
		TutorialID: tutorialID,
	}
	created, err := s.sessions.CreateSession(ctx, ownerSub, sess)
	if err != nil {
		return nil, fmt.Errorf("create tutorial session: %w", err)
	}
	return created, nil
}

// ── Session Get ────────────────────────────────────────────────────────────────

// TutorialSessionDetail wraps a session with its artifacts.
type TutorialSessionDetail struct {
	Session   *domain.TutorialSession
	Artifacts []domain.Artifact
}

// GetTutorialSession returns the session and its artifacts if owned by ownerSub.
func (s *TutorialSessionService) GetTutorialSession(ctx context.Context, id, ownerSub string) (*TutorialSessionDetail, error) {
	sess, err := s.sessions.GetSessionByID(ctx, id, ownerSub)
	if err != nil {
		return nil, wrapNotFound(err, "tutorial_session", id)
	}

	artifacts, err := s.sessions.ListArtifactsBySessionID(ctx, id, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("get session artifacts: %w", err)
	}

	return &TutorialSessionDetail{Session: sess, Artifacts: artifacts}, nil
}

// ── Session List ───────────────────────────────────────────────────────────────

// ListTutorialSessions returns all sessions for a tutorial in
// reverse-chronological order.
func (s *TutorialSessionService) ListTutorialSessions(ctx context.Context, tutorialID, ownerSub string) ([]domain.TutorialSession, error) {
	// Verify tutorial ownership.
	if _, err := s.tutorials.GetTutorialByID(ctx, tutorialID, ownerSub); err != nil {
		return nil, wrapNotFound(err, "tutorial", tutorialID)
	}

	sessions, err := s.sessions.ListSessionsByTutorialID(ctx, tutorialID, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("list tutorial sessions: %w", err)
	}
	return sessions, nil
}

// ── Session Complete ───────────────────────────────────────────────────────────

// CompleteTutorialSession transitions an in-progress session to complete.
// Returns ErrSessionTerminalError if the session is already terminal.
func (s *TutorialSessionService) CompleteTutorialSession(ctx context.Context, id, ownerSub, notes string) (*domain.TutorialSession, error) {
	existing, err := s.sessions.GetSessionByID(ctx, id, ownerSub)
	if err != nil {
		return nil, wrapNotFound(err, "tutorial_session", id)
	}
	if existing.IsTerminal() {
		return nil, &ErrSessionTerminalError{Status: domain.SessionStatus(existing.Status)}
	}

	sess, err := s.sessions.CompleteSession(ctx, id, ownerSub, notes)
	if err != nil {
		return nil, wrapNotFound(err, "tutorial_session", id)
	}
	return sess, nil
}

// ── Session Abandon ────────────────────────────────────────────────────────────

// AbandonTutorialSession transitions an in-progress session to abandoned.
// Returns ErrSessionTerminalError if the session is already terminal.
func (s *TutorialSessionService) AbandonTutorialSession(ctx context.Context, id, ownerSub string) (*domain.TutorialSession, error) {
	existing, err := s.sessions.GetSessionByID(ctx, id, ownerSub)
	if err != nil {
		return nil, wrapNotFound(err, "tutorial_session", id)
	}
	if existing.IsTerminal() {
		return nil, &ErrSessionTerminalError{Status: domain.SessionStatus(existing.Status)}
	}

	sess, err := s.sessions.AbandonSession(ctx, id, ownerSub)
	if err != nil {
		return nil, wrapNotFound(err, "tutorial_session", id)
	}
	return sess, nil
}

// ── Session Delete ─────────────────────────────────────────────────────────────

// DeleteTutorialSession removes a session and all its associated artifacts.
func (s *TutorialSessionService) DeleteTutorialSession(ctx context.Context, id, ownerSub string) error {
	if err := s.sessions.DeleteSession(ctx, id, ownerSub); err != nil {
		return wrapNotFound(err, "tutorial_session", id)
	}
	return nil
}

// ── ArtifactService ───────────────────────────────────────────────────────────

// ArtifactService implements all business operations for artifacts.
type ArtifactService struct {
	repo *repo.TutorialRepo
}

// NewArtifactService constructs an ArtifactService backed by the given repository.
func NewArtifactService(r *repo.TutorialRepo) *ArtifactService {
	return &ArtifactService{repo: r}
}

// ── Artifact Create ────────────────────────────────────────────────────────────

// CreateArtifactParams holds all caller-supplied fields for creating an artifact.
type CreateArtifactParams struct {
	Kind    domain.ArtifactKind
	Title   string
	Content string
}

// CreateArtifact validates params and persists a new artifact under sessionID.
func (s *ArtifactService) CreateArtifact(
	ctx context.Context,
	ownerSub, sessionID string,
	p CreateArtifactParams,
) (*domain.Artifact, error) {
	if !domain.ValidArtifactKind(p.Kind) {
		return nil, &ValidationError{Field: "kind", Message: "must be 'summary', 'notes', 'problem_set', or 'diagnostic'"}
	}
	if strings.TrimSpace(p.Title) == "" {
		return nil, &ValidationError{Field: "title", Message: "must not be blank"}
	}
	if strings.TrimSpace(p.Content) == "" {
		return nil, &ValidationError{Field: "content", Message: "must not be blank"}
	}

	// Verify session ownership.
	if _, err := s.repo.GetSessionByID(ctx, sessionID, ownerSub); err != nil {
		return nil, wrapNotFound(err, "tutorial_session", sessionID)
	}

	art := domain.Artifact{
		SessionID: sessionID,
		Kind:      p.Kind,
		Title:     p.Title,
		Content:   p.Content,
	}
	created, err := s.repo.CreateArtifact(ctx, ownerSub, art)
	if err != nil {
		return nil, fmt.Errorf("create artifact: %w", err)
	}
	return created, nil
}

// ── Artifact List ──────────────────────────────────────────────────────────────

// ListArtifacts returns all artifacts for a session.
func (s *ArtifactService) ListArtifacts(ctx context.Context, sessionID, ownerSub string) ([]domain.Artifact, error) {
	// Verify session ownership.
	if _, err := s.repo.GetSessionByID(ctx, sessionID, ownerSub); err != nil {
		return nil, wrapNotFound(err, "tutorial_session", sessionID)
	}

	artifacts, err := s.repo.ListArtifactsBySessionID(ctx, sessionID, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("list artifacts: %w", err)
	}
	return artifacts, nil
}

// ── Artifact Get ───────────────────────────────────────────────────────────────

// GetArtifact returns the artifact with the given id if owned by ownerSub.
func (s *ArtifactService) GetArtifact(ctx context.Context, id, ownerSub string) (*domain.Artifact, error) {
	art, err := s.repo.GetArtifactByID(ctx, id, ownerSub)
	if err != nil {
		return nil, wrapNotFound(err, "artifact", id)
	}
	return art, nil
}

// ── Artifact Delete ────────────────────────────────────────────────────────────

// DeleteArtifact removes the artifact.
func (s *ArtifactService) DeleteArtifact(ctx context.Context, id, ownerSub string) error {
	if err := s.repo.DeleteArtifact(ctx, id, ownerSub); err != nil {
		return wrapNotFound(err, "artifact", id)
	}
	return nil
}
