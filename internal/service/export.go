package service

import (
	"context"
	"fmt"

	"github.com/julianstephens/formation/internal/export"
	seminarRepo "github.com/julianstephens/formation/internal/modules/seminar/repo"
	tutorialRepo "github.com/julianstephens/formation/internal/modules/tutorial/repo"
)

// ExportService assembles full denormalized export payloads for seminars and
// sessions. It does not render them; rendering is handled by the export
// package renderers so that the service layer stays format-agnostic.
type ExportService struct {
	seminars  *seminarRepo.SeminarRepo
	sessions  *seminarRepo.SessionRepo
	tutorials *tutorialRepo.TutorialRepo
}

// NewExportService constructs an ExportService backed by the given repositories.
func NewExportService(
	seminars *seminarRepo.SeminarRepo,
	sessions *seminarRepo.SessionRepo,
	tutorials *tutorialRepo.TutorialRepo,
) *ExportService {
	return &ExportService{seminars: seminars, sessions: sessions, tutorials: tutorials}
}

// ExportSeminar loads the seminar, its thesis history, and every session with
// turns, assembling them into a single SeminarExport.
// Returns NotFoundError when the seminar does not exist or is not owned by ownerSub.
func (s *ExportService) ExportSeminar(
	ctx context.Context,
	seminarID, ownerSub string,
) (*export.SeminarExport, error) {
	sem, err := s.seminars.GetByID(ctx, seminarID, ownerSub)
	if err != nil {
		return nil, WrapNotFound(err, "seminar", seminarID)
	}

	sessions, err := s.sessions.ListBySeminarID(ctx, seminarID, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("load sessions for export: %w", err)
	}

	sessionExports := make([]export.SessionExport, 0, len(sessions))
	for _, sess := range sessions {
		turns, err := s.sessions.ListTurns(ctx, sess.ID, ownerSub)
		if err != nil {
			return nil, fmt.Errorf("load turns for session %s: %w", sess.ID, err)
		}
		sessionExports = append(sessionExports, export.SessionExport{
			Session: sess,
			Turns:   turns,
		})
	}

	return &export.SeminarExport{
		Seminar:  *sem,
		Sessions: sessionExports,
	}, nil
}

// ExportSession loads the session and its turns, assembling them into a
// SessionExport.
// Returns NotFoundError when the session does not exist or is not owned by ownerSub.
func (s *ExportService) ExportSession(
	ctx context.Context,
	sessionID, ownerSub string,
) (*export.SessionExport, error) {
	sess, err := s.sessions.GetByID(ctx, sessionID, ownerSub)
	if err != nil {
		return nil, WrapNotFound(err, "session", sessionID)
	}

	turns, err := s.sessions.ListTurns(ctx, sessionID, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("load turns for export: %w", err)
	}

	return &export.SessionExport{
		Session: *sess,
		Turns:   turns,
	}, nil
}

// ExportTutorial loads the tutorial and every session with turns, assembling them
// into a single TutorialExport.
// Returns NotFoundError when the tutorial does not exist or is not owned by ownerSub.
func (s *ExportService) ExportTutorial(
	ctx context.Context,
	tutorialID, ownerSub string,
) (*export.TutorialExport, error) {
	tut, err := s.tutorials.GetTutorialByID(ctx, tutorialID, ownerSub)
	if err != nil {
		return nil, WrapNotFound(err, "tutorial", tutorialID)
	}

	sessions, err := s.tutorials.ListSessionsByTutorialID(ctx, tutorialID, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("load sessions for tutorial export: %w", err)
	}

	sessionExports := make([]export.TutorialSessionExport, 0, len(sessions))
	for _, sess := range sessions {
		turns, err := s.tutorials.ListTutorialTurns(ctx, sess.ID, ownerSub)
		if err != nil {
			return nil, fmt.Errorf("load turns for tutorial session %s: %w", sess.ID, err)
		}
		sessionExports = append(sessionExports, export.TutorialSessionExport{
			Session: sess,
			Turns:   turns,
		})
	}

	return &export.TutorialExport{
		Tutorial: *tut,
		Sessions: sessionExports,
	}, nil
}

// ExportTutorialSession loads the tutorial session and its turns, assembling them
// into a TutorialSessionExport.
// Returns NotFoundError when the session does not exist or is not owned by ownerSub.
func (s *ExportService) ExportTutorialSession(
	ctx context.Context,
	sessionID, ownerSub string,
) (*export.TutorialSessionExport, error) {
	sess, err := s.tutorials.GetSessionByID(ctx, sessionID, ownerSub)
	if err != nil {
		return nil, WrapNotFound(err, "tutorial_session", sessionID)
	}

	turns, err := s.tutorials.ListTutorialTurns(ctx, sessionID, ownerSub)
	if err != nil {
		return nil, fmt.Errorf("load turns for tutorial session export: %w", err)
	}

	return &export.TutorialSessionExport{
		Session: *sess,
		Turns:   turns,
	}, nil
}
