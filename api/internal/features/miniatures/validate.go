package miniatures

import (
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/BarbieriM/MiniManager/api/internal/features/challengerating"
	"github.com/BarbieriM/MiniManager/api/internal/features/tags"
	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// Card 5 limits and messages.
const (
	maxNameCharacters  = 100
	maxShortText       = 60
	maxNotesCharacters = 1000
	minQuantity        = 1
	maxQuantity        = 999
	quantityMessage    = "Quantity must be a whole number from 1 to 999."
)

var (
	creatureTypes = []string{
		"aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey",
		"fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead",
	}
	creatureSizes = []string{"tiny", "small", "medium", "large", "huge", "gargantuan"}
	paintStatuses = []string{"pre_painted", "hand_painted", "unpainted"}
)

// normalized returns input with Card 5's clean-ups and defaults applied: trimmed text, quantity 1, Unpainted.
func (input Input) normalized() Input {
	input.Name = strings.TrimSpace(input.Name)
	input.StorageLocation = strings.TrimSpace(input.StorageLocation)
	input.Manufacturer = strings.TrimSpace(input.Manufacturer)
	input.Notes = strings.TrimSpace(input.Notes)
	if input.PaintStatus == "" {
		input.PaintStatus = "unpainted"
	}
	if input.Quantity == nil {
		one := 1
		input.Quantity = &one
	}
	input.Tags = tags.NormalizeAll(input.Tags)
	return input
}

// validate checks normalized input against Card 5's rules and returns every problem at once.
func (input Input) validate() error {
	var problems validation.Errors
	switch {
	case input.Name == "":
		problems.Add("name", "Name is required.")
	case utf8.RuneCountInString(input.Name) > maxNameCharacters:
		problems.Add("name", "Name must be at most 100 characters.")
	}
	if !slices.Contains(creatureTypes, input.CreatureType) {
		problems.Add("creatureType", "Pick a creature type.")
	}
	if !slices.Contains(creatureSizes, input.Size) {
		problems.Add("size", "Pick a size.")
	}
	if !slices.Contains(paintStatuses, input.PaintStatus) {
		problems.Add("paintStatus", "Pick a paint status.")
	}
	if input.ChallengeRating != nil && !challengerating.IsOfficial(*input.ChallengeRating) {
		problems.Add("challengeRating", "Pick a valid Challenge Rating.")
	}
	if input.Quantity != nil && (*input.Quantity < minQuantity || *input.Quantity > maxQuantity) {
		problems.Add("quantity", quantityMessage)
	}
	for _, message := range tags.Problems(input.Tags) {
		problems.Add("tags", message)
	}
	if utf8.RuneCountInString(input.StorageLocation) > maxShortText {
		problems.Add("storageLocation", "Storage location must be at most 60 characters.")
	}
	if utf8.RuneCountInString(input.Manufacturer) > maxShortText {
		problems.Add("manufacturer", "Manufacturer must be at most 60 characters.")
	}
	if utf8.RuneCountInString(input.Notes) > maxNotesCharacters {
		problems.Add("notes", "Notes must be at most 1000 characters.")
	}
	return problems.OrNil()
}
