package miniatures

import (
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// nameSearch is the form of a name that sorting and search use: lower-cased with accents removed, so "Éttercap"
// becomes "ettercap" (CLAUDE.md, Database rules).
func nameSearch(name string) string {
	// NFD splits "é" into "e" plus a combining accent mark (Unicode category Mn), which is then dropped.
	var builder strings.Builder
	for _, character := range norm.NFD.String(strings.ToLower(name)) {
		if !unicode.Is(unicode.Mn, character) {
			builder.WriteRune(character)
		}
	}
	return builder.String()
}
