// Package textsearch folds text for case- and accent-insensitive matching. It holds no business rules.
package textsearch

import (
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// Fold lower-cases text and removes accents, so "Éttercap" becomes "ettercap". Miniature names are stored folded in
// name_search (CLAUDE.md, Database rules), and search text is folded the same way before matching.
func Fold(name string) string {
	// NFD splits "é" into "e" plus a combining accent mark (Unicode category Mn), which is then dropped.
	var builder strings.Builder
	for _, character := range norm.NFD.String(strings.ToLower(name)) {
		if !unicode.Is(unicode.Mn, character) {
			builder.WriteRune(character)
		}
	}
	return builder.String()
}
