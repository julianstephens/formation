package service

import (
	"strings"
	"testing"
)

// ── ParseReviewJSON ───────────────────────────────────────────────────────────

func TestParseReviewJSON_validBlock(t *testing.T) {
	t.Parallel()
	input := `Here is the review.
[REVIEW_JSON]
{
  "tasks": [
    {"position": 1, "required": true,  "result": "improved",   "pattern_code": "TEXT_DRIFT"},
    {"position": 2, "required": false, "result": "unresolved", "pattern_code": "SCOPE_CREEP"}
  ],
  "pattern_updates": [
    {"pattern_code": "TEXT_DRIFT", "status": "improved"}
  ],
  "new_patterns": ["HEDGE_EXCESS"]
}
[/REVIEW_JSON]
Good work overall.`

	block, err := ParseReviewJSON(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if block == nil {
		t.Fatal("expected non-nil block")
	}
	if len(block.Tasks) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(block.Tasks))
	}
	if block.Tasks[0].Result != "improved" {
		t.Errorf("expected tasks[0].result=improved, got %q", block.Tasks[0].Result)
	}
	if len(block.PatternUpdates) != 1 {
		t.Fatalf("expected 1 pattern update, got %d", len(block.PatternUpdates))
	}
	if block.PatternUpdates[0].PatternCode != "TEXT_DRIFT" {
		t.Errorf("expected pattern_updates[0].pattern_code=TEXT_DRIFT, got %q", block.PatternUpdates[0].PatternCode)
	}
	if len(block.NewPatterns) != 1 || block.NewPatterns[0] != "HEDGE_EXCESS" {
		t.Errorf("expected new_patterns=[HEDGE_EXCESS], got %v", block.NewPatterns)
	}
}

func TestParseReviewJSON_noBlock(t *testing.T) {
	t.Parallel()
	block, err := ParseReviewJSON("No structured block here.")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if block != nil {
		t.Fatalf("expected nil block, got %+v", block)
	}
}

func TestParseReviewJSON_malformedJSON(t *testing.T) {
	t.Parallel()
	input := "[REVIEW_JSON]{not valid json}[/REVIEW_JSON]"
	block, err := ParseReviewJSON(input)
	if err == nil {
		t.Fatal("expected error for malformed JSON, got nil")
	}
	if block != nil {
		t.Fatalf("expected nil block on error, got %+v", block)
	}
}

func TestParseReviewJSON_emptyNewPatterns(t *testing.T) {
	t.Parallel()
	input := `[REVIEW_JSON]{"tasks":[],"pattern_updates":[],"new_patterns":[]}[/REVIEW_JSON]`
	block, err := ParseReviewJSON(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if block == nil {
		t.Fatal("expected non-nil block")
	}
	if len(block.NewPatterns) != 0 {
		t.Errorf("expected 0 new patterns, got %d", len(block.NewPatterns))
	}
}

// ── ValidateReviewBlock ───────────────────────────────────────────────────────

func makeTask(pos int, result, patternCode string) ReviewTaskInput {
	return ReviewTaskInput{Position: pos, Required: true, Result: result, PatternCode: patternCode}
}

func TestValidateReviewBlock_valid(t *testing.T) {
	t.Parallel()
	block := &ReviewBlock{
		Tasks: []ReviewTaskInput{
			makeTask(1, "improved", "TEXT_DRIFT"),
			makeTask(2, "partial", "SCOPE_CREEP"),
			makeTask(3, "unresolved", ""),
			makeTask(4, "incorrect", "HEDGE_EXCESS"),
		},
		PatternUpdates: []PatternUpdateInput{
			{PatternCode: "TEXT_DRIFT", Status: "improved"},
		},
		NewPatterns: []string{"FOCUS_LOSS"},
	}
	if err := ValidateReviewBlock(block, 4); err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
}

func TestValidateReviewBlock_nilBlock(t *testing.T) {
	t.Parallel()
	if err := ValidateReviewBlock(nil, 3); err == nil {
		t.Fatal("expected error for nil block")
	}
}

func TestValidateReviewBlock_wrongTaskCount(t *testing.T) {
	t.Parallel()
	block := &ReviewBlock{
		Tasks: []ReviewTaskInput{
			makeTask(1, "improved", "TEXT_DRIFT"),
		},
	}
	if err := ValidateReviewBlock(block, 3); err == nil {
		t.Fatal("expected error for wrong task count")
	}
}

func TestValidateReviewBlock_invalidResult(t *testing.T) {
	t.Parallel()
	block := &ReviewBlock{
		Tasks: []ReviewTaskInput{
			makeTask(1, "excellent", "TEXT_DRIFT"), // invalid
		},
	}
	if err := ValidateReviewBlock(block, 1); err == nil {
		t.Fatal("expected error for invalid result value")
	}
}

func TestValidateReviewBlock_invalidPatternCodeInTask(t *testing.T) {
	t.Parallel()
	block := &ReviewBlock{
		Tasks: []ReviewTaskInput{
			makeTask(1, "improved", "text_drift"), // lowercase — invalid
		},
	}
	if err := ValidateReviewBlock(block, 1); err == nil {
		t.Fatal("expected error for lowercase pattern code")
	}
}

func TestValidateReviewBlock_positionOutOfRange(t *testing.T) {
	t.Parallel()
	block := &ReviewBlock{
		Tasks: []ReviewTaskInput{
			{Position: 5, Required: true, Result: "improved", PatternCode: "TEXT_DRIFT"}, // position > taskCount=2
			{Position: 2, Required: false, Result: "partial", PatternCode: ""},
		},
	}
	if err := ValidateReviewBlock(block, 2); err == nil {
		t.Fatal("expected error for position out of range")
	}
}

func TestValidateReviewBlock_positionZero(t *testing.T) {
	t.Parallel()
	block := &ReviewBlock{
		Tasks: []ReviewTaskInput{
			{Position: 0, Required: true, Result: "improved", PatternCode: "TEXT_DRIFT"}, // position < 1
		},
	}
	if err := ValidateReviewBlock(block, 1); err == nil {
		t.Fatal("expected error for position 0")
	}
}

func TestValidateReviewBlock_invalidPatternUpdateCode(t *testing.T) {
	t.Parallel()
	block := &ReviewBlock{
		Tasks: []ReviewTaskInput{makeTask(1, "improved", "TEXT_DRIFT")},
		PatternUpdates: []PatternUpdateInput{
			{PatternCode: "bad-code", Status: "improved"}, // hyphens — invalid
		},
	}
	if err := ValidateReviewBlock(block, 1); err == nil {
		t.Fatal("expected error for invalid pattern update code")
	}
}

func TestValidateReviewBlock_invalidPatternUpdateStatus(t *testing.T) {
	t.Parallel()
	block := &ReviewBlock{
		Tasks: []ReviewTaskInput{makeTask(1, "improved", "TEXT_DRIFT")},
		PatternUpdates: []PatternUpdateInput{
			{PatternCode: "TEXT_DRIFT", Status: "resolved"}, // not a valid review status
		},
	}
	if err := ValidateReviewBlock(block, 1); err == nil {
		t.Fatal("expected error for invalid pattern update status")
	}
}

func TestValidateReviewBlock_invalidNewPattern(t *testing.T) {
	t.Parallel()
	block := &ReviewBlock{
		Tasks:       []ReviewTaskInput{makeTask(1, "improved", "TEXT_DRIFT")},
		NewPatterns: []string{"123_INVALID"}, // starts with digit — invalid
	}
	if err := ValidateReviewBlock(block, 1); err == nil {
		t.Fatal("expected error for invalid new pattern code")
	}
}

func TestValidateReviewBlock_emptyPatternCodeInTaskAllowed(t *testing.T) {
	t.Parallel()
	// Empty pattern_code is allowed (task may not map to a specific pattern)
	block := &ReviewBlock{
		Tasks: []ReviewTaskInput{
			{Position: 1, Required: false, Result: "partial", PatternCode: ""},
		},
	}
	if err := ValidateReviewBlock(block, 1); err != nil {
		t.Fatalf("expected no error for empty pattern code, got: %v", err)
	}
}

// ── StripReviewBlock ──────────────────────────────────────────────────────────

func TestStripReviewBlock_removesBlock(t *testing.T) {
	t.Parallel()
	input := "Before text.\n[REVIEW_JSON]{\"tasks\":[]}\n[/REVIEW_JSON]\nAfter text."
	result := StripReviewBlock(input)
	if strings.Contains(result, "[REVIEW_JSON]") {
		t.Errorf("block tag still present in output: %q", result)
	}
	if strings.Contains(result, "[/REVIEW_JSON]") {
		t.Errorf("closing block tag still present in output: %q", result)
	}
	if !strings.Contains(result, "Before text.") {
		t.Errorf("expected 'Before text.' to remain, got: %q", result)
	}
	if !strings.Contains(result, "After text.") {
		t.Errorf("expected 'After text.' to remain, got: %q", result)
	}
}

func TestStripReviewBlock_noBlock(t *testing.T) {
	t.Parallel()
	input := "Nothing to strip here."
	result := StripReviewBlock(input)
	if result != input {
		t.Errorf("expected unchanged output, got: %q", result)
	}
}

func TestStripReviewBlock_onlyBlock(t *testing.T) {
	t.Parallel()
	input := "[REVIEW_JSON]{}\n[/REVIEW_JSON]"
	result := StripReviewBlock(input)
	if result != "" {
		t.Errorf("expected empty string after stripping, got: %q", result)
	}
}
