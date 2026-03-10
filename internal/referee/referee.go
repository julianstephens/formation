// Package referee enforces submission policy for user turns.
// It implements locator gating: paperback-mode turns must contain a recognized
// text locator (or be explicitly marked UNANCHORED) before the agent pipeline
// proceeds. Violations are collected as flag strings that are attached to the
// persisted turn for audit and reporting.
package referee

import (
	"regexp"
	"strings"
)

// ── Errors ────────────────────────────────────────────────────────────────────

// ErrMissingLocator is returned by Check when a paperback-mode turn lacks any
// text locator and the claim is not explicitly marked UNANCHORED.
// Handlers translate this to HTTP 400 with code "missing_locator".
type ErrMissingLocator struct{}

func (e *ErrMissingLocator) Error() string {
	return "claim must include a text locator (e.g. p. 12, ch. 3, §4) " +
		"or be explicitly marked UNANCHORED"
}

// ── Flag constants ────────────────────────────────────────────────────────────

// Flag values stored in turns.flags for policy violations.
const (
	// FlagMissingLocator is attached when a paperback-mode turn contained no
	// locator (and was rejected). It is set alongside returning ErrMissingLocator.
	FlagMissingLocator = "missing_locator"
)

// ── Locator detection ─────────────────────────────────────────────────────────

// locatorPattern matches common text locator formats used when citing a
// physical or digital text:
//
//	p. 12 / pp. 12–15 / pg. 5
//	ch. 3 / chap. 3
//	§4 / § 4
//	scene 3
//	para. 7 / par. 7 / ¶7
//	l. 12  (line reference)
var locatorPattern = regexp.MustCompile(
	`(?i)` +
		`(?:pp?\.|pg\.)[ \t]*\d+` + // p. 12 / pp. 12 / pg. 5
		`|ch(?:ap?)?\.?[ \t]*\d+` + // ch. 3 / cha. 3 / chap. 3
		`|§[ \t]*\d+` + // §4 / § 4
		`|scene[ \t]+\d+` + // scene 3
		`|para?s?\.?[ \t]*\d+` + // para. 7 / par. 7
		`|¶[ \t]*\d+` + // ¶7
		`|\bl\.[ \t]*\d+`, // l. 12
)

// HasLocator reports whether text contains at least one valid text locator.
func HasLocator(text string) bool {
	return locatorPattern.MatchString(text)
}

// ── Claim detection ──────────────────────────────────────────────────────────

// claimPattern matches common claim-making constructions:
//
//	"the author/text/book/chapter/passage" + reporting verb
//	first-person claim starters ("I claim", "my argument", …)
//	"according to"
var claimPattern = regexp.MustCompile(
	`(?i)` +
		// subject + reporting verb
		`(?:the\s+(?:author|text|book|chapter|passage))\s+(?:argues|states|claims|asserts|contends|suggests|writes|notes)` +
		// first-person claim starters
		`|\bI\s+(?:claim|argue|contend|assert)\b` +
		`|\bmy\s+(?:claim|position|argument)\b` +
		// "according to"
		`|\baccording\s+to\b`,
)

// HasClaim reports whether text contains claim-like language that warrants
// locator gating in paperback mode.
func HasClaim(text string) bool {
	return claimPattern.MatchString(text)
}

// IsUnanchored reports whether the user has explicitly marked the claim as
// UNANCHORED (case-insensitive). Per the canonical prompt instructions, an
// UNANCHORED claim is accepted but treated as weaker.
func IsUnanchored(text string) bool {
	return strings.Contains(strings.ToUpper(text), "UNANCHORED")
}

// ── Policy ────────────────────────────────────────────────────────────────────

// Policy controls how the referee evaluates a submitted turn.
type Policy struct {
	// Mode is the session mode: "paperback" or "excerpt".
	// Locator gating is active when Mode is "paperback".
	Mode string

	// RequireLocator forces locator gating regardless of Mode.
	// Used in tests and any future override scenario.
	RequireLocator bool

	// HasClaims is set by the caller (e.g. from the HTTP request field
	// has_claims=true) to explicitly assert that the message contains claims.
	// When true, locator gating is enforced in paperback mode even if
	// HasClaim() would not auto-detect claim language.
	HasClaims bool
}

// ── Result ────────────────────────────────────────────────────────────────────

// Result is returned by a successful (non-erroring) Check call.
type Result struct {
	// Flags is the list of policy flags to persist on the turn.
	// Empty when the turn passes all checks cleanly.
	Flags []string
}

// ── Check ─────────────────────────────────────────────────────────────────────

// Check evaluates a user turn's text against the active policy.
//
// For paperback mode (or when RequireLocator is true):
//   - A turn that contains a recognized locator passes cleanly.
//   - A turn explicitly marked UNANCHORED passes with no flags (the agent will
//     treat it as a weaker claim per canonical prompt instructions).
//   - A turn with neither returns a non-nil *ErrMissingLocator error and also
//     sets FlagMissingLocator in Result.Flags so the caller can choose whether
//     to persist a rejected turn record for audit.
//
// For excerpt mode, locator gating is skipped; the excerpt is the authority.
func Check(pol Policy, text string) (Result, error) {
	var flags []string

	if pol.RequireLocator || (pol.Mode == "paperback" && (pol.HasClaims || HasClaim(text))) {
		if !HasLocator(text) && !IsUnanchored(text) {
			flags = append(flags, FlagMissingLocator)
			return Result{Flags: flags}, &ErrMissingLocator{}
		}
	}

	return Result{Flags: flags}, nil
}
