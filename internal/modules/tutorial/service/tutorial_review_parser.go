package service

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/julianstephens/formation/internal/domain"
)

// ReviewBlock represents the structured review data emitted by the agent.
type ReviewBlock struct {
	Tasks          []ReviewTaskInput    `json:"tasks"`
	PatternUpdates []PatternUpdateInput `json:"pattern_updates"`
	NewPatterns    []string             `json:"new_patterns"`
}

// ReviewTaskInput holds the agent's assessment of a single problem-set task.
type ReviewTaskInput struct {
	Position    int    `json:"position"`
	Required    bool   `json:"required"`
	Result      string `json:"result"`
	PatternCode string `json:"pattern_code"`
}

// PatternUpdateInput describes a status change for an existing diagnostic pattern.
type PatternUpdateInput struct {
	PatternCode string `json:"pattern_code"`
	Status      string `json:"status"`
}

// validReviewResults is the set of accepted result/status values in a review block.
var validReviewResults = map[string]bool{
	"improved":   true,
	"partial":    true,
	"unresolved": true,
	"incorrect":  true,
}

// ParseReviewJSON extracts and parses the [REVIEW_JSON]...[/REVIEW_JSON] block
// from an agent response. Returns nil, nil if no block is found.
func ParseReviewJSON(agentResponse string) (*ReviewBlock, error) {
	pattern := regexp.MustCompile(`(?s)\[REVIEW_JSON\]\s*(.*?)\s*\[/REVIEW_JSON\]`)
	matches := pattern.FindStringSubmatch(agentResponse)

	if len(matches) < 2 {
		return nil, nil
	}

	jsonStr := strings.TrimSpace(matches[1])

	var block ReviewBlock
	if err := json.Unmarshal([]byte(jsonStr), &block); err != nil {
		return nil, fmt.Errorf("parse review json: %w", err)
	}

	return &block, nil
}

// ValidateReviewBlock checks that the review block is structurally correct:
//   - task count equals taskCount
//   - all result values are one of improved/partial/unresolved/incorrect
//   - all pattern codes are UPPER_SNAKE_CASE
//   - task positions are in range [1, taskCount]
//   - all pattern_updates have valid codes and statuses
//   - all new_patterns have valid UPPER_SNAKE_CASE codes
func ValidateReviewBlock(block *ReviewBlock, taskCount int) error {
	if block == nil {
		return fmt.Errorf("review block is nil")
	}

	if len(block.Tasks) != taskCount {
		return fmt.Errorf("review block must have %d tasks, got %d", taskCount, len(block.Tasks))
	}

	for i, task := range block.Tasks {
		if !validReviewResults[task.Result] {
			return fmt.Errorf(
				"invalid result at task %d: %q (must be improved/partial/unresolved/incorrect)",
				i,
				task.Result,
			)
		}
		if task.PatternCode != "" {
			if !isValidPatternCode(domain.DiagnosticPatternCode(task.PatternCode)) {
				return fmt.Errorf("invalid pattern code at task %d: %s", i, task.PatternCode)
			}
		}
		if task.Position < 1 || task.Position > taskCount {
			return fmt.Errorf(
				"position out of range at task %d: %d (must be between 1 and %d)",
				i,
				task.Position,
				taskCount,
			)
		}
	}

	for i, update := range block.PatternUpdates {
		if !isValidPatternCode(domain.DiagnosticPatternCode(update.PatternCode)) {
			return fmt.Errorf("invalid pattern code in pattern_updates[%d]: %s", i, update.PatternCode)
		}
		if !validReviewResults[update.Status] {
			return fmt.Errorf(
				"invalid status in pattern_updates[%d]: %q (must be improved/partial/unresolved/incorrect)",
				i,
				update.Status,
			)
		}
	}

	for i, code := range block.NewPatterns {
		if !isValidPatternCode(domain.DiagnosticPatternCode(code)) {
			return fmt.Errorf("invalid pattern code in new_patterns[%d]: %s", i, code)
		}
	}

	return nil
}

// StripReviewBlock removes the review JSON block from the agent response,
// leaving only the student-facing text.
func StripReviewBlock(agentResponse string) string {
	pattern := regexp.MustCompile(`(?s)\[REVIEW_JSON\].*?\[/REVIEW_JSON\]\s*`)
	return strings.TrimSpace(pattern.ReplaceAllString(agentResponse, ""))
}
