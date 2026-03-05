package repo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/julianstephens/formation/internal/domain"
)

// TutorialRepo handles all database operations for tutorials, tutorial sessions,
// and artifacts. Every method that accesses user-owned rows accepts ownerSub and
// enforces it in the WHERE clause, making cross-owner reads structurally impossible.
type TutorialRepo struct {
	Base
}

// NewTutorialRepo constructs a TutorialRepo backed by the shared connection pool.
func NewTutorialRepo(b Base) *TutorialRepo {
	return &TutorialRepo{Base: b}
}

// ── Tutorials ─────────────────────────────────────────────────────────────────

// CreateTutorial inserts a new tutorial and returns the fully-populated record.
func (r *TutorialRepo) CreateTutorial(ctx context.Context, ownerSub string, t domain.Tutorial) (*domain.Tutorial, error) {
	const q = `
		INSERT INTO tutorials
			(owner_sub, title, subject, description, difficulty)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, owner_sub, title, subject,
		          COALESCE(description,''), difficulty,
		          created_at, updated_at`

	row := r.Pool.QueryRow(ctx, q,
		ownerSub, t.Title, t.Subject, nvlTutStr(t.Description), t.Difficulty)
	return scanTutorial(row)
}

// GetTutorialByID returns the tutorial with the given id, enforcing owner_sub.
// Returns ErrNotFound if no matching row exists.
func (r *TutorialRepo) GetTutorialByID(ctx context.Context, id, ownerSub string) (*domain.Tutorial, error) {
	const q = `
		SELECT id, owner_sub, title, subject,
		       COALESCE(description,''), difficulty,
		       created_at, updated_at
		FROM tutorials
		WHERE id = $1 AND owner_sub = $2`

	row := r.Pool.QueryRow(ctx, q, id, ownerSub)
	return scanTutorial(row)
}

// ListTutorials returns all tutorials owned by ownerSub, newest first.
func (r *TutorialRepo) ListTutorials(ctx context.Context, ownerSub string) ([]domain.Tutorial, error) {
	const q = `
		SELECT id, owner_sub, title, subject,
		       COALESCE(description,''), difficulty,
		       created_at, updated_at
		FROM tutorials
		WHERE owner_sub = $1
		ORDER BY created_at DESC`

	rows, err := r.Pool.Query(ctx, q, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("list tutorials query: %w", err)
	}
	defer rows.Close()

	var result []domain.Tutorial
	for rows.Next() {
		t, err := scanTutorial(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *t)
	}
	return result, rows.Err()
}

// UpdateTutorial applies a partial patch to the tutorial and returns the updated record.
// Returns ErrNotFound if the tutorial does not exist or belongs to a different owner.
func (r *TutorialRepo) UpdateTutorial(
	ctx context.Context,
	id, ownerSub string,
	patch domain.TutorialPatch,
) (*domain.Tutorial, error) {
	const q = `
		UPDATE tutorials
		SET title       = COALESCE($3, title),
		    subject     = COALESCE($4, subject),
		    description = COALESCE($5, description),
		    difficulty  = COALESCE($6, difficulty),
		    updated_at  = now()
		WHERE id = $1 AND owner_sub = $2
		RETURNING id, owner_sub, title, subject,
		          COALESCE(description,''), difficulty,
		          created_at, updated_at`

	row := r.Pool.QueryRow(ctx, q,
		id, ownerSub,
		patch.Title, patch.Subject, patch.Description, patch.Difficulty)
	return scanTutorial(row)
}

// DeleteTutorial removes the tutorial. Returns ErrNotFound if it does not
// exist or the caller does not own it.
func (r *TutorialRepo) DeleteTutorial(ctx context.Context, id, ownerSub string) error {
	const q = `DELETE FROM tutorials WHERE id = $1 AND owner_sub = $2`
	tag, err := r.Pool.Exec(ctx, q, id, ownerSub)
	if err != nil {
		return fmt.Errorf("delete tutorial: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ── TutorialSessions ──────────────────────────────────────────────────────────

// CreateSession inserts a new tutorial session and returns the fully-populated record.
func (r *TutorialRepo) CreateSession(ctx context.Context, ownerSub string, s domain.TutorialSession) (*domain.TutorialSession, error) {
	const q = `
		INSERT INTO tutorial_sessions (tutorial_id, owner_sub)
		VALUES ($1, $2)
		RETURNING id, tutorial_id, owner_sub, status,
		          COALESCE(notes,''), started_at, ended_at`

	row := r.Pool.QueryRow(ctx, q, s.TutorialID, ownerSub)
	return scanTutorialSession(row)
}

// GetSessionByID returns the tutorial session with the given id, enforcing owner_sub.
// Returns ErrNotFound if no matching row exists.
func (r *TutorialRepo) GetSessionByID(ctx context.Context, id, ownerSub string) (*domain.TutorialSession, error) {
	const q = `
		SELECT id, tutorial_id, owner_sub, status,
		       COALESCE(notes,''), started_at, ended_at
		FROM tutorial_sessions
		WHERE id = $1 AND owner_sub = $2`

	row := r.Pool.QueryRow(ctx, q, id, ownerSub)
	return scanTutorialSession(row)
}

// ListSessionsByTutorialID returns all sessions for a tutorial in
// reverse-chronological order. Ownership is enforced via the owner_sub column.
func (r *TutorialRepo) ListSessionsByTutorialID(ctx context.Context, tutorialID, ownerSub string) ([]domain.TutorialSession, error) {
	const q = `
		SELECT id, tutorial_id, owner_sub, status,
		       COALESCE(notes,''), started_at, ended_at
		FROM tutorial_sessions
		WHERE tutorial_id = $1 AND owner_sub = $2
		ORDER BY started_at DESC`

	rows, err := r.Pool.Query(ctx, q, tutorialID, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("list tutorial sessions by tutorial: %w", err)
	}
	defer rows.Close()

	var result []domain.TutorialSession
	for rows.Next() {
		s, err := scanTutorialSession(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list tutorial sessions iterate: %w", err)
	}
	if result == nil {
		result = []domain.TutorialSession{}
	}
	return result, nil
}

// CompleteSession marks a session as complete and records ended_at.
// Returns ErrNotFound when no matching in-progress session is found.
func (r *TutorialRepo) CompleteSession(ctx context.Context, id, ownerSub, notes string) (*domain.TutorialSession, error) {
	const q = `
		UPDATE tutorial_sessions
		SET status   = 'complete',
		    notes    = COALESCE(NULLIF($3, ''), notes),
		    ended_at = now()
		WHERE id = $1 AND owner_sub = $2
		  AND status = 'in_progress'
		RETURNING id, tutorial_id, owner_sub, status,
		          COALESCE(notes,''), started_at, ended_at`

	row := r.Pool.QueryRow(ctx, q, id, ownerSub, notes)
	sess, err := scanTutorialSession(row)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return sess, nil
}

// AbandonSession marks a session as abandoned and records ended_at.
// Returns ErrNotFound when no matching in-progress session is found.
func (r *TutorialRepo) AbandonSession(ctx context.Context, id, ownerSub string) (*domain.TutorialSession, error) {
	const q = `
		UPDATE tutorial_sessions
		SET status   = 'abandoned',
		    ended_at = now()
		WHERE id = $1 AND owner_sub = $2
		  AND status = 'in_progress'
		RETURNING id, tutorial_id, owner_sub, status,
		          COALESCE(notes,''), started_at, ended_at`

	row := r.Pool.QueryRow(ctx, q, id, ownerSub)
	sess, err := scanTutorialSession(row)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return sess, nil
}

// DeleteSession removes a tutorial session and all its associated artifacts.
// Returns ErrNotFound if the session does not exist or belongs to another owner.
func (r *TutorialRepo) DeleteSession(ctx context.Context, id, ownerSub string) error {
	const q = `DELETE FROM tutorial_sessions WHERE id = $1 AND owner_sub = $2`
	tag, err := r.Pool.Exec(ctx, q, id, ownerSub)
	if err != nil {
		return fmt.Errorf("delete tutorial session: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ── Artifacts ─────────────────────────────────────────────────────────────────

// CreateArtifact inserts a new artifact and returns the fully-populated record.
func (r *TutorialRepo) CreateArtifact(ctx context.Context, ownerSub string, a domain.Artifact) (*domain.Artifact, error) {
	const q = `
		INSERT INTO artifacts (session_id, owner_sub, kind, title, content)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, session_id, owner_sub, kind, title, content, created_at`

	row := r.Pool.QueryRow(ctx, q, a.SessionID, ownerSub, string(a.Kind), a.Title, a.Content)
	return scanArtifact(row)
}

// GetArtifactByID returns the artifact with the given id, enforcing owner_sub.
// Returns ErrNotFound if no matching row exists.
func (r *TutorialRepo) GetArtifactByID(ctx context.Context, id, ownerSub string) (*domain.Artifact, error) {
	const q = `
		SELECT id, session_id, owner_sub, kind, title, content, created_at
		FROM artifacts
		WHERE id = $1 AND owner_sub = $2`

	row := r.Pool.QueryRow(ctx, q, id, ownerSub)
	return scanArtifact(row)
}

// ListArtifactsBySessionID returns all artifacts for a session in
// chronological order. Ownership is enforced via the owner_sub column.
func (r *TutorialRepo) ListArtifactsBySessionID(ctx context.Context, sessionID, ownerSub string) ([]domain.Artifact, error) {
	const q = `
		SELECT id, session_id, owner_sub, kind, title, content, created_at
		FROM artifacts
		WHERE session_id = $1 AND owner_sub = $2
		ORDER BY created_at`

	rows, err := r.Pool.Query(ctx, q, sessionID, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("list artifacts by session: %w", err)
	}
	defer rows.Close()

	var result []domain.Artifact
	for rows.Next() {
		a, err := scanArtifact(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list artifacts iterate: %w", err)
	}
	if result == nil {
		result = []domain.Artifact{}
	}
	return result, nil
}

// DeleteArtifact removes the artifact.
// Returns ErrNotFound if it does not exist or the caller does not own it.
func (r *TutorialRepo) DeleteArtifact(ctx context.Context, id, ownerSub string) error {
	const q = `DELETE FROM artifacts WHERE id = $1 AND owner_sub = $2`
	tag, err := r.Pool.Exec(ctx, q, id, ownerSub)
	if err != nil {
		return fmt.Errorf("delete artifact: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

type tutorialScanner interface {
	Scan(dest ...any) error
}

func scanTutorial(row tutorialScanner) (*domain.Tutorial, error) {
	var t domain.Tutorial
	err := row.Scan(
		&t.ID, &t.OwnerSub,
		&t.Title, &t.Subject, &t.Description, &t.Difficulty,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("scan tutorial: %w", err)
	}
	return &t, nil
}

type tutorialSessionScanner interface {
	Scan(dest ...any) error
}

func scanTutorialSession(row tutorialSessionScanner) (*domain.TutorialSession, error) {
	var s domain.TutorialSession
	var status string
	err := row.Scan(
		&s.ID, &s.TutorialID, &s.OwnerSub,
		&status, &s.Notes,
		&s.StartedAt, &s.EndedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("scan tutorial session: %w", err)
	}
	s.Status = domain.TutorialSessionStatus(status)
	return &s, nil
}

type artifactScanner interface {
	Scan(dest ...any) error
}

func scanArtifact(row artifactScanner) (*domain.Artifact, error) {
	var a domain.Artifact
	var kind string
	err := row.Scan(
		&a.ID, &a.SessionID, &a.OwnerSub,
		&kind, &a.Title, &a.Content,
		&a.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("scan artifact: %w", err)
	}
	a.Kind = domain.ArtifactKind(kind)
	return &a, nil
}

// nvlTutStr converts an empty string to nil so pgx stores NULL for nullable columns.
func nvlTutStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}
