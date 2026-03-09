BEGIN;

-- Add reviewed_at timestamp to problem_sets
ALTER TABLE problem_sets
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Create problem_set_reviews table to store structured review output
CREATE TABLE IF NOT EXISTS problem_set_reviews (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_set_id      UUID        NOT NULL REFERENCES problem_sets (id) ON DELETE CASCADE,
    tutorial_session_id UUID        NOT NULL REFERENCES tutorial_sessions (id) ON DELETE CASCADE,
    strictness          TEXT        NOT NULL,
    review_json         JSONB       NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problem_set_reviews_problem_set ON problem_set_reviews (problem_set_id);
CREATE INDEX IF NOT EXISTS idx_problem_set_reviews_session     ON problem_set_reviews (tutorial_session_id);

COMMIT;
