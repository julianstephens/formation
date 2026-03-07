// Package service contains the application-layer business logic.
// Services validate inputs, enforce invariants, and delegate persistence to
// repository types. They are intentionally free of HTTP concerns.
package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/julianstephens/formation/internal/domain"
	"github.com/julianstephens/formation/internal/modules/seminar/repo"
	"github.com/julianstephens/formation/internal/observability"
)

// validModes is the exhaustive set of allowed seminar modes.
var validModes = map[string]bool{"paperback": true, "excerpt": true}

// SeminarService implements all business operations for seminars.
type SeminarService struct {
	repo *repo.SeminarRepo
}

// NewSeminarService constructs a SeminarService backed by the given repository.
func NewSeminarService(r *repo.SeminarRepo) *SeminarService {
	return &SeminarService{repo: r}
}

// ── Create ─────────────────────────────────────────────────────────────────────

// CreateParams holds all caller-supplied fields for creating a seminar.
type CreateParams struct {
	Title               string
	Author              string
	EditionNotes        string
	ThesisCurrent       string
	DefaultMode         string
	DefaultReconMinutes int
}

// Create validates params and persists a new seminar owned by ownerSub.
func (s *SeminarService) Create(ctx context.Context, ownerSub string, p CreateParams) (*domain.Seminar, error) {
	logger := observability.LoggerFromContext(ctx)
	logger.Debug("creating seminar",
		slog.String("owner", ownerSub),
		slog.String("title", p.Title),
		slog.String("mode", p.DefaultMode),
	)

	if p.DefaultMode == "" {
		p.DefaultMode = "paperback"
	}
	if p.DefaultReconMinutes == 0 {
		p.DefaultReconMinutes = 18
	}
	if err := validateSeminarFields(p.DefaultMode, p.DefaultReconMinutes); err != nil {
		logger.Debug("seminar validation failed", slog.String("error", err.Error()))
		return nil, err
	}
	sem := domain.Seminar{
		Title:               p.Title,
		Author:              p.Author,
		EditionNotes:        p.EditionNotes,
		ThesisCurrent:       p.ThesisCurrent,
		DefaultMode:         p.DefaultMode,
		DefaultReconMinutes: p.DefaultReconMinutes,
	}
	created, err := s.repo.Create(ctx, ownerSub, sem)
	if err != nil {
		logger.Error("failed to create seminar", slog.String("error", err.Error()))
		return nil, err
	}
	logger.Debug("seminar created", slog.String("id", created.ID))
	return created, nil
}

// ── Get ────────────────────────────────────────────────────────────────────────

// Get returns the seminar with the given id if it is owned by ownerSub.
func (s *SeminarService) Get(ctx context.Context, id, ownerSub string) (*domain.Seminar, error) {
	logger := observability.LoggerFromContext(ctx)
	logger.Debug("fetching seminar", slog.String("id", id), slog.String("owner", ownerSub))

	sem, err := s.repo.GetByID(ctx, id, ownerSub)
	if err != nil {
		logger.Debug("seminar not found", slog.String("id", id), slog.String("error", err.Error()))
		return nil, wrapNotFound(err, "seminar", id)
	}
	logger.Debug("seminar fetched", slog.String("id", id), slog.String("title", sem.Title))
	return sem, nil
}

// ── List ───────────────────────────────────────────────────────────────────────

// List returns all seminars owned by ownerSub.
func (s *SeminarService) List(ctx context.Context, ownerSub string) ([]domain.Seminar, error) {
	seminars, err := s.repo.List(ctx, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("list seminars: %w", err)
	}
	if seminars == nil {
		seminars = []domain.Seminar{}
	}
	return seminars, nil
}

// ── Update ─────────────────────────────────────────────────────────────────────

// UpdateParams holds all patchable seminar fields; nil means "no change".
type UpdateParams struct {
	Title               *string
	Author              *string
	EditionNotes        *string
	DefaultMode         *string
	DefaultReconMinutes *int
}

// Update applies a partial update to the seminar and returns the updated record.
func (s *SeminarService) Update(ctx context.Context, id, ownerSub string, p UpdateParams) (*domain.Seminar, error) {
	logger := observability.LoggerFromContext(ctx)
	logger.Debug("updating seminar", slog.String("id", id), slog.String("owner", ownerSub))

	if p.DefaultMode != nil && !validModes[*p.DefaultMode] {
		logger.Debug("invalid mode provided", slog.String("mode", *p.DefaultMode))
		return nil, &ValidationError{Field: "default_mode", Message: "must be 'paperback' or 'excerpt'"}
	}
	if p.DefaultReconMinutes != nil && (*p.DefaultReconMinutes < 15 || *p.DefaultReconMinutes > 20) {
		logger.Debug("invalid recon minutes", slog.Int("minutes", *p.DefaultReconMinutes))
		return nil, &ValidationError{Field: "default_recon_minutes", Message: "must be between 15 and 20"}
	}
	patch := domain.SeminarPatch{
		Title:               p.Title,
		Author:              p.Author,
		EditionNotes:        p.EditionNotes,
		DefaultMode:         p.DefaultMode,
		DefaultReconMinutes: p.DefaultReconMinutes,
	}
	sem, err := s.repo.Update(ctx, id, ownerSub, patch)
	if err != nil {
		logger.Error("failed to update seminar", slog.String("id", id), slog.String("error", err.Error()))
		return nil, wrapNotFound(err, "seminar", id)
	}
	logger.Debug("seminar updated", slog.String("id", id))
	return sem, nil
}

// ── Delete ─────────────────────────────────────────────────────────────────────

// Delete removes the seminar. Returns ErrNotFound if it does not exist or is
// owned by a different user.
func (s *SeminarService) Delete(ctx context.Context, id, ownerSub string) error {
	logger := observability.LoggerFromContext(ctx)
	logger.Debug("deleting seminar", slog.String("id", id), slog.String("owner", ownerSub))

	if err := s.repo.Delete(ctx, id, ownerSub); err != nil {
		logger.Error("failed to delete seminar", slog.String("id", id), slog.String("error", err.Error()))
		return wrapNotFound(err, "seminar", id)
	}
	logger.Debug("seminar deleted", slog.String("id", id))
	return nil
}

// ── helpers ────────────────────────────────────────────────────────────────────

func validateSeminarFields(mode string, reconMinutes int) error {
	if !validModes[mode] {
		return &ValidationError{Field: "default_mode", Message: "must be 'paperback' or 'excerpt'"}
	}
	if reconMinutes < 15 || reconMinutes > 20 {
		return &ValidationError{Field: "default_recon_minutes", Message: "must be between 15 and 20"}
	}
	return nil
}
