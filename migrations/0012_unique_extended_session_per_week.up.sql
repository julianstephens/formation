-- Enforce at most one in-progress extended session per tutorial per owner per week
-- (Req #8: one-active-extended-session-per-week).

-- date_trunc(text, timestamptz) is STABLE (timezone-dependent), which is not
-- allowed in index expressions. This IMMUTABLE wrapper fixes the timezone to UTC
-- so the result is deterministic for any given input.
CREATE OR REPLACE FUNCTION week_trunc_utc(ts TIMESTAMPTZ)
    RETURNS TIMESTAMP LANGUAGE SQL IMMUTABLE STRICT AS $$
        SELECT date_trunc('week', ts AT TIME ZONE 'UTC')
    $$;

CREATE UNIQUE INDEX unique_active_extended_session_per_week
    ON tutorial_sessions (tutorial_id, owner_sub, week_trunc_utc(started_at))
    WHERE kind = 'extended' AND status = 'in_progress';
