// Package domain contains pure business-logic types with no framework dependencies.
package domain

import "time"

// Seminar represents a user-owned reading seminar.
type Seminar struct {
	ID                  string    `json:"id"`
	OwnerSub            string    `json:"-"`
	Title               string    `json:"title"`
	Author              string    `json:"author,omitempty"`
	EditionNotes        string    `json:"edition_notes,omitempty"`
	ThesisCurrent       string    `json:"thesis_current"`
	DefaultMode         string    `json:"default_mode"`
	DefaultReconMinutes int       `json:"default_recon_minutes"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// SeminarPatch carries optional fields for a partial seminar update.
// Nil pointer fields are left unchanged in the database.
type SeminarPatch struct {
	Title               *string
	Author              *string
	EditionNotes        *string
	DefaultMode         *string
	DefaultReconMinutes *int
}
