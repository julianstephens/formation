BEGIN;

-- Add kind column to tutorial_sessions
ALTER TABLE tutorial_sessions
ADD COLUMN kind TEXT
    CHECK (kind IN ('diagnostic', 'extended'));

COMMIT;
