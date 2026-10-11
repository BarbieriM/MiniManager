// Package validation collects field-level input errors so handlers can return them as one RFC 9457 errors list.
package validation

import "strings"

// FieldError is one problem with one input field. Field uses the JSON name, such as "displayName".
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Errors is every field problem found in one input. An empty Errors means the input is valid.
type Errors []FieldError

// Add records a problem with field.
func (e *Errors) Add(field, message string) {
	*e = append(*e, FieldError{Field: field, Message: message})
}

// Has reports whether field has a problem.
func (e Errors) Has(field string) bool {
	for _, fieldError := range e {
		if fieldError.Field == field {
			return true
		}
	}
	return false
}

// OrNil returns e as an error, or nil when there are no problems.
func (e Errors) OrNil() error {
	if len(e) == 0 {
		return nil
	}
	return e
}

func (e Errors) Error() string {
	messages := make([]string, len(e))
	for i, fieldError := range e {
		messages[i] = fieldError.Field + ": " + fieldError.Message
	}
	return "invalid input: " + strings.Join(messages, "; ")
}
