ALTER TABLE seminar_sessions RENAME TO sessions;
ALTER INDEX idx_seminar_sessions_seminar_started RENAME TO idx_sessions_seminar_started;
ALTER INDEX idx_seminar_sessions_owner_started   RENAME TO idx_sessions_owner_started;
ALTER TABLE seminar_turns RENAME TO turns;
ALTER INDEX idx_seminar_turns_session_created RENAME TO idx_turns_session_created;
