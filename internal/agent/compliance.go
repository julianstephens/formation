// Package agent – compliance violation checking and rewrite flow.
// CheckViolations runs a fast, heuristic rule set against an agent's raw
// output.  ApplyCompliance calls CheckViolations and, when violations are
// found, asks the provider to rewrite the output using the assembled rewrite
// prompt from rewrite.yml.
package agent

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
)

// ── Flag constants ─────────────────────────────────────────────────────────────

// FlagAgentRewrite is appended to a turn's flags slice when compliance
// checking detected violations and the LLM produced a rewritten response.
const FlagAgentRewrite = "agent_rewrite"

// ── Violation rules ───────────────────────────────────────────────────────────

// rule is a named heuristic that tests an agent response for a specific
// violation category.
type rule struct {
	name  string
	desc  string
	check func(output, phase, mode string) bool
}

// breaksCharacterRe matches common self-identification phrases an LLM should
// never emit when playing the Socratic tutor role.
var breaksCharacterRe = regexp.MustCompile(
	`(?i)\b(i am|i'm)\s+(an?\s+)?(ai|llm|language model|chatbot|assistant)\b`,
)

// rules is the ordered set of heuristic checks applied to every agent output.
// Each rule is O(n) in output length; the full set runs in < 1 ms.
var agentRules = []rule{
	{
		name: "no_question",
		desc: "Response contains no question during a timed dialogue phase",
		check: func(output, phase, _ string) bool {
			switch phase {
			case "reconstruction", "opposition", "reversal":
				return !strings.Contains(output, "?")
			}
			return false
		},
	},
	{
		name: "reveals_thesis",
		desc: "Response directly reveals the thesis or correct answer",
		check: func(output, _, _ string) bool {
			lower := strings.ToLower(output)
			for _, pat := range []string{
				"the thesis is",
				"the correct answer is",
				"the answer is",
				"the author argues that",
				"the book claims",
				"the author's main point is",
			} {
				if strings.Contains(lower, pat) {
					return true
				}
			}
			return false
		},
	},
	{
		name: "breaks_character",
		desc: "Response refers to the agent as an AI or language model",
		check: func(output, _, _ string) bool {
			return breaksCharacterRe.MatchString(output)
		},
	},
	{
		name: "premature_phase_mention",
		desc: "Response mentions a later phase (opposition/reversal) during reconstruction",
		check: func(output, phase, _ string) bool {
			if phase != "reconstruction" {
				return false
			}
			lower := strings.ToLower(output)
			return strings.Contains(lower, "opposition") || strings.Contains(lower, "reversal")
		},
	},
	{
		name: "empty_response",
		desc: "Response is blank or whitespace-only",
		check: func(output, _, _ string) bool {
			return strings.TrimSpace(output) == ""
		},
	},
}

// ── CheckViolations ───────────────────────────────────────────────────────────

// CheckViolations runs all heuristic rules against agentOutput and returns a
// (possibly nil/empty) slice of human-readable violation descriptions.
//
// phase is the session's current SessionPhase string value (e.g.
// "reconstruction"); mode is "paperback" or "excerpt".
func CheckViolations(agentOutput, phase, mode string) []string {
	var violations []string
	for _, r := range agentRules {
		if r.check(agentOutput, phase, mode) {
			violations = append(violations, r.desc)
			slog.Debug("compliance violation detected",
				slog.String("rule", r.name),
				slog.String("desc", r.desc),
				slog.String("phase", phase),
			)
		}
	}
	if len(violations) > 0 {
		slog.Debug("total compliance violations",
			slog.Int("count", len(violations)),
			slog.String("phase", phase),
		)
	}
	return violations
}

// ── ApplyCompliance ───────────────────────────────────────────────────────────

// RewriteResult carries the outcome of ApplyCompliance.
type RewriteResult struct {
	// Text is the final text to persist – either the original or the rewrite.
	Text string
	// Rewritten is true when a rewrite was performed (violations found + LLM
	// rewrote successfully).
	Rewritten bool
	// Flags contains flag strings to merge into the turn's flags slice.
	// Non-empty when Rewritten is true.
	Flags []string
}

// ApplyCompliance checks agentOutput for policy violations using CheckViolations
// and, if any are found, calls provider.Complete with the assembled rewrite
// prompt to produce a compliant replacement.
//
// When the output is clean, it is returned in RewriteResult unchanged and
// RewriteResult.Rewritten is false.
//
// When a rewrite fails (API error), the original text is returned together
// with FlagAgentRewrite so the pipeline can still persist a turn; the error is
// also returned so the caller can log/metric it.
func ApplyCompliance(
	ctx context.Context,
	provider Provider,
	assembler *Assembler,
	agentOutput, phase, mode string,
) (RewriteResult, error) {
	slog.Debug("checking compliance",
		slog.String("phase", phase),
		slog.String("mode", mode),
		slog.Int("output_length", len(agentOutput)),
	)

	violations := CheckViolations(agentOutput, phase, mode)
	if len(violations) == 0 {
		slog.Debug("no compliance violations found")
		return RewriteResult{Text: agentOutput}, nil
	}

	slog.Debug("violations found, requesting rewrite",
		slog.Int("violation_count", len(violations)),
		slog.Any("violations", violations),
	)

	rewriteMessages := assembler.AssembleRewrite(RewriteParams{
		OriginalOutput: agentOutput,
		ActivePhase:    phase,
		ActiveMode:     mode,
		ViolationList:  violations,
	})

	rewritten, err := provider.Complete(ctx, rewriteMessages)
	if err != nil {
		slog.Error("compliance rewrite failed", slog.String("error", err.Error()))
		// Surface the error but still return the original text so the turn
		// pipeline can persist without blocking the user.
		return RewriteResult{
			Text:      agentOutput,
			Rewritten: false,
			Flags:     []string{FlagAgentRewrite},
		}, fmt.Errorf("compliance rewrite call: %w", err)
	}

	slog.Debug("compliance rewrite completed",
		slog.Int("original_length", len(agentOutput)),
		slog.Int("rewritten_length", len(rewritten)),
	)

	return RewriteResult{
		Text:      rewritten,
		Rewritten: true,
		Flags:     []string{FlagAgentRewrite},
	}, nil
}
