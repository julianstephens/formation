// Package domain contains pure business-logic types with no framework dependencies.
package domain

import "time"

// ── Status ─────────────────────────────────────────────────────────────────────

// SessionStatus represents the overall lifecycle state of a session.
type SessionStatus string

const (
	SessionStatusInProgress SessionStatus = "in_progress"
	SessionStatusComplete   SessionStatus = "complete"
	SessionStatusAbandoned  SessionStatus = "abandoned"
)

// ── Phase ──────────────────────────────────────────────────────────────────────

// SessionPhase represents the current discussion phase within a session.
// Phases advance linearly: reconstruction → opposition → reversal →
// residue_required → done.
type SessionPhase string

const (
	PhaseReconstruction  SessionPhase = "reconstruction"
	PhaseOpposition      SessionPhase = "opposition"
	PhaseReversal        SessionPhase = "reversal"
	PhaseResidueRequired SessionPhase = "residue_required"
	PhaseDone            SessionPhase = "done"
)

// NextPhase returns the phase that immediately follows p in the linear
// progression. It returns the same phase when already at the end.
func NextPhase(p SessionPhase) SessionPhase {
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
func ValidPhase(p SessionPhase) bool {
	switch p {
	case PhaseReconstruction, PhaseOpposition, PhaseReversal, PhaseResidueRequired, PhaseDone:
		return true
	}
	return false
}

// ValidStatus reports whether s is a recognized status value.
func ValidStatus(s SessionStatus) bool {
	switch s {
	case SessionStatusInProgress, SessionStatusComplete, SessionStatusAbandoned:
		return true
	}
	return false
}

// ── Session ────────────────────────────────────────────────────────────────────

// Session is a single seminar reading session owned by a user.
type Session struct {
	ID             string        `json:"id"`
	SeminarID      string        `json:"seminar_id"`
	OwnerSub       string        `json:"-"`
	SectionLabel   string        `json:"section_label"`
	Mode           string        `json:"mode"`
	ExcerptText    string        `json:"excerpt_text,omitempty"`
	ExcerptHash    string        `json:"excerpt_hash,omitempty"`
	Status         SessionStatus `json:"status"`
	Phase          SessionPhase  `json:"phase"`
	ReconMinutes   int           `json:"recon_minutes"`
	PhaseStartedAt time.Time     `json:"phase_started_at"`
	PhaseEndsAt    time.Time     `json:"phase_ends_at"`
	StartedAt      time.Time     `json:"started_at"`
	EndedAt        *time.Time    `json:"ended_at,omitempty"`
	ResidueText    string        `json:"residue_text,omitempty"`
}

// IsPhaseExpired reports whether the current phase timer has elapsed.
func (s *Session) IsPhaseExpired() bool {
	return !s.PhaseEndsAt.IsZero() && time.Now().UTC().After(s.PhaseEndsAt)
}

// PhaseAllowsTurns reports whether human turns may be submitted in the current
// phase. Turns are only accepted during the three timed dialogue phases;
// residue_required expects a residue submission, and done is terminal.
func (s *Session) PhaseAllowsTurns() bool {
	switch s.Phase {
	case PhaseReconstruction, PhaseOpposition, PhaseReversal:
		return true
	}
	return false
}

// IsTerminal reports whether the session has reached an unrecoverable state.
func (s *Session) IsTerminal() bool {
	return s.Status == SessionStatusComplete || s.Status == SessionStatusAbandoned
}

// ── Turn ───────────────────────────────────────────────────────────────────────

// Turn is a single message within a session conversation.
type Turn struct {
	ID        string       `json:"id"`
	SessionID string       `json:"session_id"`
	Phase     SessionPhase `json:"phase"`
	Speaker   string       `json:"speaker"` // "user" | "agent" | "system"
	Text      string       `json:"text"`
	Flags     []string     `json:"flags"`
	CreatedAt time.Time    `json:"created_at"`
}
