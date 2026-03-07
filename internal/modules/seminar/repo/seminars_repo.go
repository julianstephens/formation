package repo

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/julianstephens/formation/internal/domain"
	"github.com/julianstephens/formation/internal/repo"
)

// SeminarRepo handles all database operations for seminars and thesis history.
// Every method that accesses user-owned rows accepts ownerSub and enforces it
// in the WHERE clause, making cross-owner reads structurally impossible.
type SeminarRepo struct {
	repo.Base
}

// NewSeminarRepo constructs a SeminarRepo backed by the shared connection pool.
func NewSeminarRepo(b repo.Base) *SeminarRepo {
	return &SeminarRepo{Base: b}
}

// ── Seminars ──────────────────────────────────────────────────────────────────

// Create inserts a new seminar and returns the fully-populated record.
func (r *SeminarRepo) Create(ctx context.Context, ownerSub string, s domain.Seminar) (*domain.Seminar, error) {
	slog.Debug("db: creating seminar",
		slog.String("owner", ownerSub),
		slog.String("title", s.Title),
	)

	const q = `
		INSERT INTO seminars
			(owner_sub, title, author, edition_notes, thesis_current, default_mode, default_recon_minutes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, owner_sub,
		          title, COALESCE(author,''), COALESCE(edition_notes,''),
		          thesis_current, default_mode, default_recon_minutes,
		          created_at, updated_at`

	row := r.Pool.QueryRow(ctx, q,
		ownerSub, s.Title, s.Author, s.EditionNotes,
		s.ThesisCurrent, s.DefaultMode, s.DefaultReconMinutes)
	created, err := scanSeminar(row)
	if err != nil {
		slog.Error("db: failed to create seminar", slog.String("error", err.Error()))
		return nil, err
	}
	slog.Debug("db: seminar created", slog.String("id", created.ID))
	return created, nil
}

// GetByID returns the seminar with the given id, enforcing owner_sub.
// Returns ErrNotFound if no matching row exists.
func (r *SeminarRepo) GetByID(ctx context.Context, id, ownerSub string) (*domain.Seminar, error) {
	slog.Debug("db: fetching seminar", slog.String("id", id), slog.String("owner", ownerSub))

	const q = `
		SELECT id, owner_sub,
		       title, COALESCE(author,''), COALESCE(edition_notes,''),
		       thesis_current, default_mode, default_recon_minutes,
		       created_at, updated_at
		FROM seminars
		WHERE id = $1 AND owner_sub = $2`

	row := r.Pool.QueryRow(ctx, q, id, ownerSub)
	sem, err := scanSeminar(row)
	if err != nil {
		if errors.Is(err, repo.ErrNotFound) {
			slog.Debug("db: seminar not found", slog.String("id", id))
		} else {
			slog.Error("db: failed to fetch seminar", slog.String("id", id), slog.String("error", err.Error()))
		}
		return nil, err
	}
	slog.Debug("db: seminar fetched", slog.String("id", id))
	return sem, nil
}

// List returns all seminars owned by ownerSub, newest first.
func (r *SeminarRepo) List(ctx context.Context, ownerSub string) ([]domain.Seminar, error) {
	const q = `
		SELECT id, owner_sub,
		       title, COALESCE(author,''), COALESCE(edition_notes,''),
		       thesis_current, default_mode, default_recon_minutes,
		       created_at, updated_at
		FROM seminars
		WHERE owner_sub = $1
		ORDER BY created_at DESC`

	rows, err := r.Pool.Query(ctx, q, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("list seminars query: %w", err)
	}
	defer rows.Close()

	var result []domain.Seminar
	for rows.Next() {
		s, err := scanSeminar(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *s)
	}
	return result, rows.Err()
}

// Update applies a partial patch to the seminar and returns the updated record.
// Fields left nil in the patch are kept at their current database values.
// Returns ErrNotFound if the seminar does not exist or belongs to a different owner.
func (r *SeminarRepo) Update(
	ctx context.Context,
	id, ownerSub string,
	patch domain.SeminarPatch,
) (*domain.Seminar, error) {
	const q = `
		UPDATE seminars
		SET title                 = COALESCE($3, title),
		    author                = COALESCE($4, author),
		    edition_notes         = COALESCE($5, edition_notes),
		    default_mode          = COALESCE($6, default_mode),
		    default_recon_minutes = COALESCE($7, default_recon_minutes),
		    updated_at            = now()
		WHERE id = $1 AND owner_sub = $2
		RETURNING id, owner_sub,
		          title, COALESCE(author,''), COALESCE(edition_notes,''),
		          thesis_current, default_mode, default_recon_minutes,
		          created_at, updated_at`

	row := r.Pool.QueryRow(ctx, q,
		id, ownerSub,
		patch.Title, patch.Author, patch.EditionNotes,
		patch.DefaultMode, patch.DefaultReconMinutes)
	return scanSeminar(row)
}

// Delete removes the seminar. Returns ErrNotFound if it does not exist or the
// caller does not own it.
func (r *SeminarRepo) Delete(ctx context.Context, id, ownerSub string) error {
	slog.Debug("db: deleting seminar", slog.String("id", id), slog.String("owner", ownerSub))

	const q = `DELETE FROM seminars WHERE id = $1 AND owner_sub = $2`
	tag, err := r.Pool.Exec(ctx, q, id, ownerSub)
	if err != nil {
		slog.Error("db: failed to delete seminar", slog.String("id", id), slog.String("error", err.Error()))
		return fmt.Errorf("delete seminar: %w", err)
	}
	if tag.RowsAffected() == 0 {
		slog.Debug("db: seminar not found for deletion", slog.String("id", id))
		return repo.ErrNotFound
	}
	slog.Debug("db: seminar deleted", slog.String("id", id))
	return nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

// scanner is satisfied by both *pgx.Row and pgx.Rows, allowing scanSeminar to
// be used from both QueryRow and inside a Next() loop.
type scanner interface {
	Scan(dest ...any) error
}

func scanSeminar(s scanner) (*domain.Seminar, error) {
	var sem domain.Seminar
	err := s.Scan(
		&sem.ID, &sem.OwnerSub,
		&sem.Title, &sem.Author, &sem.EditionNotes,
		&sem.ThesisCurrent, &sem.DefaultMode, &sem.DefaultReconMinutes,
		&sem.CreatedAt, &sem.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repo.ErrNotFound
		}
		return nil, fmt.Errorf("scan seminar: %w", err)
	}
	return &sem, nil
}
