// Package httpx holds the JSON and RFC 9457 problem helpers. No business rules.
package httpx

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/BarbieriM/MiniManager/api/internal/platform/validation"
)

// maxBodyBytes caps request bodies; no MVP request needs more than a few kilobytes.
const maxBodyBytes = 1 << 20

// Problem is an RFC 9457 problem details body, with the field-level errors list the API promises.
type Problem struct {
	Type   string                  `json:"type"`
	Title  string                  `json:"title"`
	Status int                     `json:"status"`
	Detail string                  `json:"detail,omitempty"`
	Errors []validation.FieldError `json:"errors,omitempty"`
}

// WriteJSON writes value as a JSON body with status.
func WriteJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write json response: %v", err)
	}
}

// WriteProblem writes an application/problem+json body. detail is shown to Users, so it must be safe to read.
func WriteProblem(w http.ResponseWriter, status int, detail string, fieldErrors ...validation.FieldError) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	problem := Problem{Type: "about:blank", Title: http.StatusText(status), Status: status, Detail: detail, Errors: fieldErrors}
	if err := json.NewEncoder(w).Encode(problem); err != nil {
		log.Printf("write problem response: %v", err)
	}
}

// WriteValidationProblem writes a 400 listing every field problem in err.
func WriteValidationProblem(w http.ResponseWriter, err validation.Errors) {
	WriteProblem(w, http.StatusBadRequest, "Some fields are invalid.", err...)
}

// WriteInternalError logs err and writes a 500 that reveals nothing about it.
func WriteInternalError(w http.ResponseWriter, r *http.Request, err error) {
	log.Printf("%s %s: %v", r.Method, r.URL.Path, err)
	WriteProblem(w, http.StatusInternalServerError, "Something went wrong. Try again.")
}

// DecodeJSON reads a JSON body into target, rejecting unknown fields and bodies over 1 MiB.
func DecodeJSON(w http.ResponseWriter, r *http.Request, target any) error {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("decode request body: %w", err)
	}
	if decoder.More() {
		return errors.New("decode request body: more than one JSON value")
	}
	return nil
}
