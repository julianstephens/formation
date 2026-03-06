BEGIN;

-- ── tutorial_turns ────────────────────────────────────────────────────────────
CREATE TABLE tutorial_turns (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID        NOT NULL REFERENCES tutorial_sessions (id) ON DELETE CASCADE,
    speaker    TEXT        NOT NULL
                   CHECK (speaker IN ('user', 'agent', 'system')),
    text       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutorial_turns_session_created ON tutorial_turns (session_id, created_at);

COMMIT;
