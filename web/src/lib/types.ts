// TypeScript mirror of the backend DTOs defined in internal/http/dto.go and
// internal/domain/*.go. Keep in sync when backend types change.

// ── Shared ────────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: unknown;
}

// ── Seminar ───────────────────────────────────────────────────────────────────

export interface Seminar {
  id: string;
  title: string;
  author?: string;
  edition_notes?: string;
  thesis_current: string;
  default_mode: string;
  default_recon_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSeminarInput {
  title: string;
  author?: string;
  edition_notes?: string;
  thesis_current: string;
  default_mode?: string;
  default_recon_minutes?: number;
}

export interface UpdateSeminarInput {
  title?: string;
  author?: string;
  edition_notes?: string;
  default_mode?: string;
  default_recon_minutes?: number;
}

// ── Session ───────────────────────────────────────────────────────────────────

export type SessionStatus = "in_progress" | "complete" | "abandoned";
export type SessionPhase =
  | "reconstruction"
  | "opposition"
  | "reversal"
  | "residue_required"
  | "done";

export interface Session {
  id: string;
  seminar_id: string;
  section_label: string;
  mode: string;
  excerpt_text?: string;
  excerpt_hash?: string;
  status: SessionStatus;
  phase: SessionPhase;
  recon_minutes: number;
  phase_started_at: string;
  phase_ends_at: string;
  started_at: string;
  ended_at?: string;
  residue_text?: string;
}

export interface Turn {
  id: string;
  session_id: string;
  phase: SessionPhase;
  speaker: string;
  text: string;
  flags: string[];
  created_at: string;
}

export interface SessionDetail extends Session {
  turns: Turn[];
}

export interface CreateSessionInput {
  section_label: string;
  mode?: string;
  excerpt_text?: string;
  recon_minutes?: number;
}
