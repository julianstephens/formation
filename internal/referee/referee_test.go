package referee_test

import (
	"errors"
	"testing"

	"github.com/julianstephens/formation/internal/referee"
)

// ── HasLocator ────────────────────────────────────────────────────────────────

func TestHasLocator_recognized(t *testing.T) {
	t.Parallel()

	positive := []struct {
		name string
		text string
	}{
		{"page abbreviation p.", "See p. 12 for the introduction."},
		{"page abbreviation pp.", "Discussed in pp. 12–15."},
		{"page abbreviation pg.", "Refer to pg. 5."},
		{"chapter ch.", "As shown in ch. 3."},
		{"chapter chap.", "See chap. 7."},
		{"section symbol §", "Per §4 of the text."},
		{"section symbol with space", "Per § 4."},
		{"scene", "In scene 3 the argument shifts."},
		{"para.", "See para. 7."},
		{"par.", "See par. 2."},
		{"pilcrow ¶", "cf. ¶7."},
		{"line reference l.", "At l. 12 the author writes…"},
		{"locator within sentence", "The author says (p. 42) that…"},
		{"multiple locators", "From p. 10 to p. 20 and ch. 2."},
	}

	for _, tc := range positive {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if !referee.HasLocator(tc.text) {
				t.Errorf("HasLocator(%q) = false, want true", tc.text)
			}
		})
	}
}

func TestHasLocator_unrecognized(t *testing.T) {
	t.Parallel()

	negative := []struct {
		name string
		text string
	}{
		{"bare word page (no abbrev)", "The author addresses this on page twelve."},
		{"empty string", ""},
		{"chapter without number", "In the chapter the author…"},
		{"citation without locator", "According to the text this is important."},
		{"number only no prefix", "12 is the important page."},
	}

	for _, tc := range negative {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if referee.HasLocator(tc.text) {
				t.Errorf("HasLocator(%q) = true, want false", tc.text)
			}
		})
	}
}

// ── IsUnanchored ──────────────────────────────────────────────────────────────

func TestIsUnanchored(t *testing.T) {
	t.Parallel()

	cases := []struct {
		text string
		want bool
	}{
		{"UNANCHORED: this claim lacks a locator.", true},
		{"The argument is UNANCHORED from the text.", true},
		{"unanchored claim here.", true},           // case-insensitive
		{"Unanchored", true},                       // single word
		{"This is not an unanchored claim.", true}, // substring match
		{"This is a normal claim.", false},
		{"", false},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.text, func(t *testing.T) {
			t.Parallel()
			got := referee.IsUnanchored(tc.text)
			if got != tc.want {
				t.Errorf("IsUnanchored(%q) = %v, want %v", tc.text, got, tc.want)
			}
		})
	}
}

// ── Check – paperback mode ────────────────────────────────────────────────────

func TestCheck_paperback_withLocator_passes(t *testing.T) {
	t.Parallel()

	pol := referee.Policy{Mode: "paperback"}
	res, err := referee.Check(pol, "At p. 42 the author claims the opposite.")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Flags) != 0 {
		t.Errorf("expected no flags, got %v", res.Flags)
	}
}

func TestCheck_paperback_UNANCHORED_passes(t *testing.T) {
	t.Parallel()

	pol := referee.Policy{Mode: "paperback"}
	res, err := referee.Check(pol, "UNANCHORED: this claim is self-evident.")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Flags) != 0 {
		t.Errorf("expected no flags, got %v", res.Flags)
	}
}

func TestCheck_paperback_noLocator_returnsErrMissingLocator(t *testing.T) {
	t.Parallel()

	// Must use text with claim language so the new gate fires.
	pol := referee.Policy{Mode: "paperback"}
	res, err := referee.Check(pol, "The author claims something interesting here.")
	if err == nil {
		t.Fatal("expected ErrMissingLocator, got nil")
	}

	var el *referee.ErrMissingLocator
	if !errors.As(err, &el) {
		t.Errorf("error type = %T, want *ErrMissingLocator", err)
	}

	found := false
	for _, f := range res.Flags {
		if f == referee.FlagMissingLocator {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected flag %q in %v", referee.FlagMissingLocator, res.Flags)
	}
}

// ── Check – excerpt mode ──────────────────────────────────────────────────────

func TestCheck_excerpt_noLocator_passes(t *testing.T) {
	t.Parallel()

	pol := referee.Policy{Mode: "excerpt"}
	// No locator, no UNANCHORED — excerpt mode skips gating entirely.
	res, err := referee.Check(pol, "The author makes a bold claim here.")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Flags) != 0 {
		t.Errorf("expected no flags, got %v", res.Flags)
	}
}

// ── Check – RequireLocator override ──────────────────────────────────────────

func TestCheck_requireLocator_override(t *testing.T) {
	t.Parallel()

	// Even in excerpt mode, RequireLocator=true forces gating.
	pol := referee.Policy{Mode: "excerpt", RequireLocator: true}
	_, err := referee.Check(pol, "No locator at all.")
	if err == nil {
		t.Fatal("expected ErrMissingLocator when RequireLocator=true")
	}
}

func TestCheck_requireLocator_passesWithLocator(t *testing.T) {
	t.Parallel()

	pol := referee.Policy{Mode: "excerpt", RequireLocator: true}
	_, err := referee.Check(pol, "See p. 5 for the supporting quote.")
	if err != nil {
		t.Errorf("unexpected error with RequireLocator=true and locator present: %v", err)
	}
}

// ── ErrMissingLocator.Error ───────────────────────────────────────────────────

func TestErrMissingLocator_errorString(t *testing.T) {
	t.Parallel()

	e := &referee.ErrMissingLocator{}
	msg := e.Error()
	if msg == "" {
		t.Error("ErrMissingLocator.Error() returned empty string")
	}
}

// ── HasClaim ──────────────────────────────────────────────────────────────────

func TestHasClaim_positive(t *testing.T) {
	t.Parallel()

	positive := []struct {
		name string
		text string
	}{
		{"the author argues", "The author argues that freedom is essential."},
		{"the text states", "The text states the opposite."},
		{"the book claims", "The book claims this view is correct."},
		{"the chapter asserts", "The chapter asserts a strong position."},
		{"the passage contends", "The passage contends the argument is flawed."},
		{"the author suggests", "The author suggests a different reading."},
		{"the author writes", "The author writes about the tension here."},
		{"the author notes", "The author notes an important distinction."},
		{"I claim", "I claim that the argument succeeds."},
		{"I argue", "I argue the opposite is true."},
		{"I contend", "I contend this passage is pivotal."},
		{"I assert", "I assert the evidence is insufficient."},
		{"my claim", "My claim is that the text contradicts itself."},
		{"my position", "My position is that the author is wrong."},
		{"my argument", "My argument rests on the following premise."},
		{"according to", "According to the text, freedom matters."},
		{"case-insensitive", "THE AUTHOR ARGUES freedom is paramount."},
	}

	for _, tc := range positive {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if !referee.HasClaim(tc.text) {
				t.Errorf("HasClaim(%q) = false, want true", tc.text)
			}
		})
	}
}

func TestHasClaim_negative(t *testing.T) {
	t.Parallel()

	negative := []struct {
		name string
		text string
	}{
		{"plain question", "What does freedom mean in this context?"},
		{"empty string", ""},
		{"conversational", "I think this is an interesting point."},
		{"chapter without verb", "In the chapter the discussion begins."},
		{"unrelated number", "There are 12 reasons this matters."},
		{"locator only", "See p. 42 for the supporting evidence."},
	}

	for _, tc := range negative {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if referee.HasClaim(tc.text) {
				t.Errorf("HasClaim(%q) = true, want false", tc.text)
			}
		})
	}
}

// ── Check – claim-language gating ────────────────────────────────────────────

func TestCheck_paperback_noClaimLanguage_passes(t *testing.T) {
	t.Parallel()

	pol := referee.Policy{Mode: "paperback"}
	// Plain conversational message — no claim language, no locator needed.
	res, err := referee.Check(pol, "What do you think about the ending?")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Flags) != 0 {
		t.Errorf("expected no flags, got %v", res.Flags)
	}
}

func TestCheck_paperback_hasClaims_override_gates(t *testing.T) {
	t.Parallel()

	// HasClaims=true forces gating even without auto-detected claim language.
	pol := referee.Policy{Mode: "paperback", HasClaims: true}
	_, err := referee.Check(pol, "Just a plain message with no locator.")
	if err == nil {
		t.Fatal("expected ErrMissingLocator when HasClaims=true and no locator")
	}

	var el *referee.ErrMissingLocator
	if !errors.As(err, &el) {
		t.Errorf("error type = %T, want *ErrMissingLocator", err)
	}
}
