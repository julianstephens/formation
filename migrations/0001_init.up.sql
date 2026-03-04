BEGIN;

-- ── seminars ──────────────────────────────────────────────────────────────────
CREATE TABLE seminars (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_sub             TEXT        NOT NULL,
    title                 TEXT        NOT NULL,
    author                TEXT,
    edition_notes         TEXT,
    thesis_current        TEXT        NOT NULL,
    default_mode          TEXT        NOT NULL DEFAULT 'paperback'
                              CHECK (default_mode IN ('paperback', 'excerpt')),
    default_recon_minutes INT         NOT NULL DEFAULT 18
                              CHECK (default_recon_minutes BETWEEN 15 AND 20),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seminars_owner_created ON seminars (owner_sub, created_at);

-- ── sessions ──────────────────────────────────────────────────────────────────
CREATE TABLE sessions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    seminar_id       UUID        NOT NULL REFERENCES seminars (id) ON DELETE CASCADE,
    owner_sub        TEXT        NOT NULL,
    section_label    TEXT        NOT NULL,
    mode             TEXT        NOT NULL
                         CHECK (mode IN ('paperback', 'excerpt')),
    excerpt_text     TEXT,
    excerpt_hash     TEXT,
    status           TEXT        NOT NULL DEFAULT 'in_progress'
                         CHECK (status IN ('in_progress', 'complete', 'abandoned')),
    phase            TEXT        NOT NULL DEFAULT 'reconstruction'
                         CHECK (phase IN ('reconstruction', 'opposition', 'reversal', 'residue_required', 'done')),
    recon_minutes    INT         NOT NULL,
    phase_started_at TIMESTAMPTZ NOT NULL,
    phase_ends_at    TIMESTAMPTZ NOT NULL,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at         TIMESTAMPTZ,
    residue_text     TEXT
);

CREATE INDEX idx_sessions_seminar_started ON sessions (seminar_id,  started_at);
CREATE INDEX idx_sessions_owner_started   ON sessions (owner_sub,   started_at);

-- ── turns ─────────────────────────────────────────────────────────────────────
CREATE TABLE turns (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID        NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    phase      TEXT        NOT NULL,
    speaker    TEXT        NOT NULL
                   CHECK (speaker IN ('user', 'agent', 'system')),
    text       TEXT        NOT NULL,
    flags      JSONB       NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_turns_session_created ON turns (session_id, created_at);

COMMIT;
