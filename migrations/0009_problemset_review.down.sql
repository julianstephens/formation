BEGIN;

-- Drop problem_set_reviews table
DROP TABLE IF EXISTS problem_set_reviews;

-- Remove reviewed_at column from problem_sets
ALTER TABLE problem_sets
    DROP COLUMN IF EXISTS reviewed_at;

COMMIT;
