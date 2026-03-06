BEGIN;

-- Remove kind column from tutorial_sessions
ALTER TABLE tutorial_sessions
DROP COLUMN kind;

COMMIT;
