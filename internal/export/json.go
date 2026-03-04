package export

import "encoding/json"

// RenderSeminarJSON marshals the full seminar export to pretty-printed JSON.
func RenderSeminarJSON(e *SeminarExport) ([]byte, error) {
	return json.MarshalIndent(e, "", "  ")
}

// RenderSessionJSON marshals a session export to pretty-printed JSON.
func RenderSessionJSON(e *SessionExport) ([]byte, error) {
	return json.MarshalIndent(e, "", "  ")
}
