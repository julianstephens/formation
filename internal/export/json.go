package export

import "encoding/json"

// RenderSeminarJSON marshals the full seminar export to pretty-printed JSON.
func RenderSeminarJSON(e *SeminarExport) ([]byte, error) {
	return json.MarshalIndent(e, "", "  ")
}

// RenderSeminarSessionJSON marshals a seminar session export to pretty-printed JSON.
func RenderSeminarSessionJSON(e *SeminarSessionExport) ([]byte, error) {
	return json.MarshalIndent(e, "", "  ")
}

// RenderTutorialJSON marshals the full tutorial export to pretty-printed JSON.
func RenderTutorialJSON(e *TutorialExport) ([]byte, error) {
	return json.MarshalIndent(e, "", "  ")
}

// RenderTutorialSessionJSON marshals a tutorial session export to pretty-printed JSON.
func RenderTutorialSessionJSON(e *TutorialSessionExport) ([]byte, error) {
	return json.MarshalIndent(e, "", "  ")
}

// RenderProblemSetJSON marshals a problem set export to pretty-printed JSON.
func RenderProblemSetJSON(e *ProblemSetExport) ([]byte, error) {
	return json.MarshalIndent(e, "", "  ")
}
