## Plan: Rename `Session*` → `SeminarSession*` (Backend)

**TL;DR:** Rename all generic `Session*` Go symbols and the `sessions` database table to `SeminarSession*`/`seminar_sessions`, and rename the generic `Turn` struct and `turns` table to `SeminarTurn`/`seminar_turns`. Seminar and tutorial turns remain **separate tables** — their schemas have diverged (seminar turns carry `phase` + `flags`; tutorial turns carry `failed`) and a unified table would require nullable columns with no schema-level enforcement. HTTP routes are renamed from `/v1/sessions` to `/v1/seminar-sessions` (matching the existing `/v1/tutorial-sessions` convention), and the frontend is updated accordingly. The changes span 8 phases across ~25 files plus a new migration pair.

---

### Phase 1 — Domain layer

`internal/domain/session.go` → rename file to `seminar_session.go`
- `Session` → `SeminarSession`
- `SessionStatus` → `SeminarSessionStatus`, `SessionPhase` → `SeminarSessionPhase`
- Constants `SessionStatusInProgress/Complete/Abandoned` → `SeminarSessionStatus*`
- `Turn` → `SeminarTurn` (seminar-only; `TutorialTurn` remains unchanged)
- Leave `Phase*` constants and `NextPhase`/`ValidPhase`/`ValidStatus` unchanged (not `Session`-prefixed)

---

### Phase 2 — Repository

`internal/modules/seminar/repo/sessions_repo.go` → rename file to `seminar_sessions_repo.go`
- `SessionRepo` → `SeminarSessionRepo`, `NewSessionRepo` → `NewSeminarSessionRepo`
- All SQL table references: `"sessions"` → `"seminar_sessions"`, `"turns"` → `"seminar_turns"`
- Return/param types: `domain.Turn` → `domain.SeminarTurn`

---

### Phase 3 — Service layer

`internal/modules/seminar/service/sessions.go` → `seminar_sessions.go`
- `SessionService` → `SeminarSessionService`, `NewSessionService` → `NewSeminarSessionService`
- `CreateSessionParams` → `CreateSeminarSessionParams`, `SessionDetail` → `SeminarSessionDetail`

`internal/modules/seminar/service/sessions_test.go` → `seminar_sessions_test.go`

`internal/modules/seminar/service/errors.go`
- `ErrSessionTerminalError` → `ErrSeminarSessionTerminalError`

`internal/modules/seminar/service/turns.go`
- `sessions *repo.SessionRepo` field + `NewTurnService` param → `*repo.SeminarSessionRepo`

---

### Phase 4 — HTTP Handlers

`internal/modules/seminar/handlers/sessions.go` → `seminar_sessions.go`
- `SessionHandler` → `SeminarSessionHandler`, `NewSessionHandler` → `NewSeminarSessionHandler`
- `toSessionResponse` → `toSeminarSessionResponse`, `toSessionDetailResponse` → `toSeminarSessionDetailResponse`
- `handleSessionServiceError` → `handleSeminarSessionServiceError`

---

### Phase 5 — HTTP layer (DTOs + router)

`internal/http/dto.go`
- `CreateSessionRequest` → `CreateSeminarSessionRequest`
- `SessionResponse` → `SeminarSessionResponse`, `SessionDetailResponse` → `SeminarSessionDetailResponse`
- `TurnResponse` → `SeminarTurnResponse`
- All `domain.Turn` field types → `domain.SeminarTurn`

`internal/http/router.go`
- `SessionRouteRegistrar` → `SeminarSessionRouteRegistrar`
- `RouterDeps.Sessions` → `RouterDeps.SeminarSessions`
- Route group: `v1.Group("/sessions")` → `v1.Group("/seminar-sessions")`
- Placeholder fallback strings updated accordingly

---

### Phase 6 — Supporting packages *(parallel)*

| File | Changes |
|---|---|
| `internal/app/app.go` | Update wiring variables + type refs |
| `internal/scheduler/scheduler.go` | `*repo.SessionRepo` → `*repo.SeminarSessionRepo`; `*domain.Session` → `*domain.SeminarSession`; `domain.SessionPhase` → `domain.SeminarSessionPhase` |
| `internal/sse/hub.go` | `SessionCompletedPayload` → `SeminarSessionCompletedPayload`; update `*domain.Session` params |
| `internal/export/export.go` | `SessionExport` → `SeminarSessionExport`; `SessionExport.Turns []domain.Turn` → `[]domain.SeminarTurn` |
| `internal/export/json.go` | `RenderSessionJSON` → `RenderSeminarSessionJSON` |
| `internal/export/markdown.go` | `RenderSessionMarkdown` → `RenderSeminarSessionMarkdown`, `renderSessionSection` → `renderSeminarSessionSection` |
| `internal/service/export.go` | `*seminarRepo.SessionRepo` → `SeminarSessionRepo`; `export.SessionExport` → `SeminarSessionExport` |
| `internal/agent/assembler.go` | `domain.SessionPhase` → `domain.SeminarSessionPhase` |

---

### Phase 7 — Database migration

New `migrations/0010_rename_sessions.{up,down}.sql`:

**Up:**
```sql
ALTER TABLE sessions RENAME TO seminar_sessions;
ALTER INDEX idx_sessions_seminar_started RENAME TO idx_seminar_sessions_seminar_started;
ALTER INDEX idx_sessions_owner_started   RENAME TO idx_seminar_sessions_owner_started;
ALTER TABLE turns RENAME TO seminar_turns;
ALTER INDEX idx_turns_session_created RENAME TO idx_seminar_turns_session_created;
```

**Down:**
```sql
ALTER TABLE seminar_sessions RENAME TO sessions;
ALTER INDEX idx_seminar_sessions_seminar_started RENAME TO idx_sessions_seminar_started;
ALTER INDEX idx_seminar_sessions_owner_started   RENAME TO idx_sessions_owner_started;
ALTER TABLE seminar_turns RENAME TO turns;
ALTER INDEX idx_seminar_turns_session_created RENAME TO idx_turns_session_created;
```

> **Note:** `tutorial_turns` is untouched — it is already correctly namespaced and has a divergent schema (`failed` column instead of `phase`/`flags`).

---

### Phase 8 — Frontend

**API call paths** — `web/src/lib/api.ts` (6 occurrences), `web/src/hooks/useSessionEvents.ts` (1), `web/src/contexts/SessionEventsContext.tsx` (1):
- All `` `/sessions/${sessionId}` `` → `` `/seminar-sessions/${sessionId}` ``

**React Router route definitions** — `web/src/App.tsx`:
- `path="/sessions/:id/review"` → `path="/seminar-sessions/:id/review"`
- `path="/sessions/:id/export"` → `path="/seminar-sessions/:id/export"`
- `path="/sessions/:id"` → `path="/seminar-sessions/:id"`

**`navigate()` and `to=` prop call sites**:

| File | Details |
|---|---|
| `web/src/components/Layout.tsx` | `navigate(\`/sessions/${s.id}\`)` → `/seminar-sessions/` |
| `web/src/pages/Dashboard.tsx` | `navigate(\`/sessions/${session.id}\`)` → `/seminar-sessions/` |
| `web/src/pages/SeminarDetail.tsx` | `navigate` ×2, `ExportButton to=` ×1 → `/seminar-sessions/` |
| `web/src/pages/SeminarSessionRunner.tsx` | `navigate(\`/sessions/${id}/review\`)` ×3 → `/seminar-sessions/` |
| `web/src/pages/SessionReview.tsx` | `navigate(\`/sessions/${id}/export\`)` → `/seminar-sessions/` |
| `web/src/pages/Export.tsx` | comment + redirect string → `/seminar-sessions/` |

---

### Verification

1. `go build ./...` — zero errors
2. `go test ./...` — all existing tests pass
3. Apply migration on dev DB; confirm `seminar_sessions` and `seminar_turns` are accessible
4. Smoke-test `GET /v1/seminar-sessions/:id` and `POST /v1/seminars/:id/sessions` still work
5. Frontend: open a seminar session — URL bar shows `/seminar-sessions/:id`, SSE connects, turns submit successfully

---

### Decisions

- **HTTP routes renamed** — `/v1/sessions` → `/v1/seminar-sessions`; matches the existing `/v1/tutorial-sessions` convention and removes ambiguity; frontend updated in Phase 8
- **`Turn` → `SeminarTurn` / `turns` → `seminar_turns`** — included in this pass; the domain file is already being touched and symmetry with `TutorialTurn`/`tutorial_turns` requires it
- **Separate turns tables** — `seminar_turns` and `tutorial_turns` remain distinct; their schemas have diverged (`phase`+`flags` vs `failed`) and a single table with a `kind` discriminator would require nullable columns with no schema-level enforcement per kind
