ALTER TABLE sessions RENAME TO seminar_sessions;
ALTER INDEX idx_sessions_seminar_started RENAME TO idx_seminar_sessions_seminar_started;
ALTER INDEX idx_sessions_owner_started   RENAME TO idx_seminar_sessions_owner_started;
ALTER TABLE turns RENAME TO seminar_turns;
ALTER INDEX idx_turns_session_created RENAME TO idx_seminar_turns_session_created;
