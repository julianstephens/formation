BEGIN;

-- Add failed column to tutorial_turns to track turns that failed to get a response
ALTER TABLE tutorial_turns
ADD COLUMN failed BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
