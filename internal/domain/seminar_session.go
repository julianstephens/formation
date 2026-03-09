// Package domain contains pure business-logic types with no framework dependencies.
package domain

import "time"

// ── Status ─────────────────────────────────────────────────────────────────────

// SeminarSessionStatus represents the overall lifecycle state of a seminar session.
type SeminarSessionStatus string

const (
	SeminarSessionStatusInProgress SeminarSessionStatus = "in_progress"
	SeminarSessionStatusComplete   SeminarSessionStatus = "complete"
	SeminarSessionStatusAbandoned  SeminarSessionStatus = "abandoned"
)

// ── Phase ──────────────────────────────────────────────────────────────────────

// SeminarSessionPhase represents the current discussion phase within a seminar session.
// Phases advance linearly: reconstruction → opposition → reversal →
// residue_required → done.
type SeminarSessionPhase string

const (
	PhaseReconstruction  SeminarSessionPhase = "reconstruction"
	PhaseOpposition      SeminarSessionPhase = "opposition"
	PhaseReversal        SeminarSessionPhase = "reversal"
	PhaseResidueRequired SeminarSessionPhase = "residue_required"
	PhaseDone            SeminarSessionPhase = "done"
)

// NextPhase returns the phase that immediately follows p in the linear
// progression. It returns the same phase when already at the end.
func NextPhase(p SeminarSessionPhase) SeminarSessionPhase {
	switch p {
	case PhaseReconstruction:
		return PhaseOpposition
	case PhaseOpposition:
		return PhaseReversal
	case PhaseReversal:
		return PhaseResidueRequired
	case PhaseResidueRequired:
		return PhaseDone
	default:
		return p
	}
}

// ValidPhase reports whether p is one of the recognized phase values.
func ValidPhase(p SeminarSessionPhase) bool {
	switch p {
	case PhaseReconstruction, PhaseOpposition, PhaseReversal, PhaseResidueRequired, PhaseDone:
		return true
	}
	return false
}

// ValidStatus reports whether s is a recognized status value.
func ValidStatus(s SeminarSessionStatus) bool {
	switch s {
	case SeminarSessionStatusInProgress, SeminarSessionStatusComplete, SeminarSessionStatusAbandoned:
		return true
	}
	return false
}

// ── Session ────────────────────────────────────────────────────────────────────

// SeminarSession is a single seminar reading session owned by a user.
type SeminarSession struct {
	ID             string               `json:"id"`
	SeminarID      string               `json:"seminar_id"`
	OwnerSub       string               `json:"-"`
	SectionLabel   string               `json:"section_label"`
	Mode           string               `json:"mode"`
	ExcerptText    string               `json:"excerpt_text,omitempty"`
	ExcerptHash    string               `json:"excerpt_hash,omitempty"`
	Status         SeminarSessionStatus `json:"status"`
	Phase          SeminarSessionPhase  `json:"phase"`
	ReconMinutes   int                  `json:"recon_minutes"`
	PhaseStartedAt time.Time            `json:"phase_started_at"`
	PhaseEndsAt    time.Time            `json:"phase_ends_at"`
	StartedAt      time.Time            `json:"started_at"`
	EndedAt        *time.Time           `json:"ended_at,omitempty"`
	ResidueText    string               `json:"residue_text,omitempty"`
}

// IsPhaseExpired reports whether the current phase timer has elapsed.
func (s *SeminarSession) IsPhaseExpired() bool {
	return !s.PhaseEndsAt.IsZero() && time.Now().UTC().After(s.PhaseEndsAt)
}

// PhaseAllowsTurns reports whether human turns may be submitted in the current
// phase. Turns are only accepted during the three timed dialogue phases;
// residue_required expects a residue submission, and done is terminal.
func (s *SeminarSession) PhaseAllowsTurns() bool {
	switch s.Phase {
	case PhaseReconstruction, PhaseOpposition, PhaseReversal:
		return true
	}
	return false
}

// IsTerminal reports whether the session has reached an unrecoverable state.
func (s *SeminarSession) IsTerminal() bool {
	return s.Status == SeminarSessionStatusComplete || s.Status == SeminarSessionStatusAbandoned
}

// ── Turn ───────────────────────────────────────────────────────────────────────

// SeminarTurn is a single message within a seminar session conversation.
type SeminarTurn struct {
	ID        string              `json:"id"`
	SessionID string              `json:"session_id"`
	Phase     SeminarSessionPhase `json:"phase"`
	Speaker   string              `json:"speaker"` // "user" | "agent" | "system"
	Text      string              `json:"text"`
	Flags     []string            `json:"flags"`
	CreatedAt time.Time           `json:"created_at"`
}
