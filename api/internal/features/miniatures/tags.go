package miniatures

import (
	"regexp"
	"slices"
	"strings"
	"unicode"
	"unicode/utf8"
)

// Tag rules from Card 5 rule 3. web/src/shared/lib/normalizeTag.ts and addTag.ts apply the same rules in the form.
const (
	maxTags          = 20
	maxTagCharacters = 30
	tagLengthMessage = "A tag must be 1 to 30 characters."
	tagFormatMessage = "Use letters, numbers, - or _ in tags, with an optional namespace like faction:drow."
	tagCountMessage  = "A miniature can have at most 20 tags."
)

// whitespace matches what the browser's \s and trim() treat as whitespace: Go's \s is ASCII only, so it adds the
// Unicode separators (\p{Z}, such as the non-breaking space) and the zero-width no-break space U+FEFF.
const whitespace = `[\s\p{Z}\x{FEFF}]`

var (
	spacesAroundColon = regexp.MustCompile(whitespace + `*:` + whitespace + `*`)
	spaces            = regexp.MustCompile(whitespace + `+`)
	repeatedDashes    = regexp.MustCompile(`-{2,}`)
	// A tag is a word, optionally namespaced: "goblin-boss" or "faction:drow".
	tagPattern = regexp.MustCompile(`^[a-z0-9]+(?:[-_][a-z0-9]+)*(?::[a-z0-9]+(?:[-_][a-z0-9]+)*)?$`)
)

// normalizeTag trims and lower-cases, drops spaces around the namespace colon and turns other spaces into dashes:
// "Faction : Drow" → "faction:drow", "Goblin Boss" → "goblin-boss".
func normalizeTag(tag string) string {
	tag = strings.ToLower(strings.TrimFunc(tag, isWhitespace))
	tag = spacesAroundColon.ReplaceAllString(tag, ":")
	tag = spaces.ReplaceAllString(tag, "-")
	return repeatedDashes.ReplaceAllString(tag, "-")
}

// normalizeTags normalizes each tag and drops repeats, keeping the first one's position.
func normalizeTags(tags []string) []string {
	normalized := make([]string, 0, len(tags))
	for _, tag := range tags {
		tag = normalizeTag(tag)
		if !slices.Contains(normalized, tag) {
			normalized = append(normalized, tag)
		}
	}
	return normalized
}

// tagProblems returns the Card 5 messages that apply to normalized tags, each message once.
func tagProblems(tags []string) []string {
	var messages []string
	addOnce := func(message string) {
		if !slices.Contains(messages, message) {
			messages = append(messages, message)
		}
	}
	for _, tag := range tags {
		if length := utf8.RuneCountInString(tag); length < 1 || length > maxTagCharacters {
			addOnce(tagLengthMessage)
		} else if !tagPattern.MatchString(tag) {
			addOnce(tagFormatMessage)
		}
	}
	if len(tags) > maxTags {
		addOnce(tagCountMessage)
	}
	return messages
}

// isWhitespace is the character version of whitespace, for trimming.
func isWhitespace(character rune) bool {
	return unicode.IsSpace(character) || unicode.In(character, unicode.Z) || character == '\uFEFF'
}
