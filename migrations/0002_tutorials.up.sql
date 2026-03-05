BEGIN;

-- ── tutorials ─────────────────────────────────────────────────────────────────
CREATE TABLE tutorials (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_sub   TEXT        NOT NULL,
    title       TEXT        NOT NULL,
    subject     TEXT        NOT NULL,
    description TEXT,
    difficulty  TEXT        NOT NULL DEFAULT 'beginner'
                    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutorials_owner_created ON tutorials (owner_sub, created_at);

-- ── tutorial_sessions ─────────────────────────────────────────────────────────
CREATE TABLE tutorial_sessions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tutorial_id UUID        NOT NULL REFERENCES tutorials (id) ON DELETE CASCADE,
    owner_sub   TEXT        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'complete', 'abandoned')),
    notes       TEXT,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at    TIMESTAMPTZ
);

CREATE INDEX idx_tutorial_sessions_tutorial_started ON tutorial_sessions (tutorial_id, started_at);
CREATE INDEX idx_tutorial_sessions_owner_started    ON tutorial_sessions (owner_sub,   started_at);

-- ── artifacts ─────────────────────────────────────────────────────────────────
CREATE TABLE artifacts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID        NOT NULL REFERENCES tutorial_sessions (id) ON DELETE CASCADE,
    owner_sub  TEXT        NOT NULL,
    kind       TEXT        NOT NULL
                   CHECK (kind IN ('summary', 'notes', 'problem_set', 'diagnostic')),
    title      TEXT        NOT NULL,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_artifacts_session_created ON artifacts (session_id, created_at);

COMMIT;
