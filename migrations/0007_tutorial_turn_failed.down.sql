BEGIN;

-- Remove failed column from tutorial_turns
ALTER TABLE tutorial_turns
DROP COLUMN failed;

COMMIT;
