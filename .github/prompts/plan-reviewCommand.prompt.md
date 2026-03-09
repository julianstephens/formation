# Plan: /diagnose command for any tutorial session kind

## Overview
Add a `/diagnose` slash command available in both `diagnostic` and `extended` tutorial sessions. The user picks a subset of session artifacts via a checkbox builder UI; the agent performs a canonical `review_only` review (Reconstruction → Observed Patterns → Evidence → Immediate Repair) and the DIAGNOSTIC_JSON block is parsed to update the pattern ledger.

---

## Phase 1 — Backend (Go)

### Files: `internal/modules/tutorial/service/tutorials.go`

1. Add `tutorialCommandDiagnose tutorialCommand = iota` to the command enum (after `tutorialCommandReviewProblemSet`)
2. Add case `/diagnose` in `parseAndValidateTutorialCommand`:
   - Available for BOTH `diagnostic` and `extended` session kinds (no restriction)
   - Returns `tutorialCommandDiagnose, nil`
3. Add `diagnoseCommandOptions` struct:
   - `ArtifactIDs []string` — IDs of artifacts to include; empty = all
4. Add `parseDiagnoseCommandOptions(text string) (diagnoseCommandOptions, error)`:
   - Parses `/artifacts id1,id2,...` flag from the command string (comma-separated list)
   - Validates no unknown flags
5. In `SubmitTutorialTurn` — add handling for `cmd == tutorialCommandDiagnose`:
   - Call `parseDiagnoseCommandOptions(text)`
   - Force `taskMode = "review_only"` regardless of session kind
   - After the artifact fetch (`s.repo.ListArtifactsBySessionID`), filter `artifacts` to only those with IDs in `diagnoseCmdOpts.ArtifactIDs` (empty = no filter = all)
   - Security: validate each requested artifact ID is actually in the fetched list (owned by session/user) before filtering
   - Pass filtered artifacts to `formatArtifacts(...)` for prompt assembly
   - Post-response: still parse `[DIAGNOSTIC_JSON]` block and record entries (same as normal diagnostic flow)
   - No `[REVIEW_JSON]` or `[PROBLEMSET_JSON]` parsing needed

---

## Phase 2 — Frontend

### New file: `web/src/components/chat/DiagnoseCommandBuilder.tsx`
- Props: `artifacts: Artifact[]`, `onSelect: (command: string) => void`, `onCancel: () => void`
- Renders: a title ("Build /diagnose command"), a checkbox list of artifacts (showing `kind` + `title` for each), Submit/Cancel buttons
- When submitted: generates `/diagnose` (nothing selected = all) or `/diagnose /artifacts id1,id2` (subset selected)
- Reuses existing box/card styling from `ProblemSetCommandBuilder.tsx` and `ReviewProblemSetCommandBuilder.tsx`

### File: `web/src/components/chat/CommandSuggestions.tsx`
- Add new entry to `COMMANDS`: `{ name: "/diagnose", description: "Run a canonical diagnose on selected artifacts" }` — no `sessionKind` filter

### File: `web/src/components/chat/ChatInput.tsx`
- Add `artifacts?: Artifact[]` prop (import `Artifact` from `@/lib/types`)
- Add `showDiagnoseCommandBuilder` state (boolean)
- When `/diagnose` detected: `setShowDiagnoseCommandBuilder(true)`, hide others
- In JSX: render `<DiagnoseCommandBuilder artifacts={artifacts ?? []} onSelect={handleCommandSelect} onCancel={handleCommandCancel} />`
- Update `filteredCommands` memo: include `/diagnose` in filtered results (it has no `sessionKind` filter, so it always appears when typed)
- Update `showCommandBuilder`/`showDiagnoseCommandBuilder` resets in `handleSubmit` and `handleCommandCancel` to also reset `showDiagnoseCommandBuilder`

### File: `web/src/pages/TutorialSession.tsx`
- Pass `artifacts={detail?.artifacts ?? []}` to `<ChatInput>` (artifacts are already in `detail` state)

---

## Verification
2. Select `/diagnose` → `DiagnoseCommandBuilder` opens with session artifact checkboxes
3. Select 1–2 artifacts → command string becomes `/diagnose /artifacts id1,id2`
4. Submit → user turn saved, agent response streams with Reconstruction/Patterns/Evidence/Repair sections
5. Agent response with `[DIAGNOSTIC_JSON]` block → pattern ledger updated
6. In extended session: `/diagnose` also appears and works the same way
7. In extended session: `/problem-set` and `/review-problem-set` still restricted to `extended` only
8. `/diagnose` with no artifacts selected → uses all session artifacts (or empty message if none)
9. Backend rejects unknown IDs in `/artifacts` flag with a `ValidationError`

## Key files to reference
- `internal/modules/tutorial/service/tutorials.go` — command enum, parse/validate, SubmitTutorialTurn
- `internal/agent/prompts/tutorial/canonical.yml` — `review_only` task addendum already defined
- `web/src/components/chat/ReviewProblemSetCommandBuilder.tsx` — UI template to follow
- `web/src/components/chat/ProblemSetCommandBuilder.tsx` — artifact checkbox pattern reference
- `web/src/components/chat/DiagnoseCommandBuilder.tsx` — artifact checkbox pattern reference
- `web/src/components/chat/ChatInput.tsx` — command builder wiring pattern
- `web/src/lib/types.ts` — `Artifact` type

## Decisions
- Only tutorial sessions (both kinds); seminar sessions have no command system, excluded from scope
- Empty artifact selection = use all session artifacts (not an error)
- Diagnostic entries parsed from DIAGNOSTIC_JSON block post-response (same as normal flows)
- No new prompt YAML changes needed; `review_only` task addendum already exists
- Filter artifacts in-memory after full fetch (avoids new repo method; uses existing `GetArtifactByID` security model via session ownership already enforced)
