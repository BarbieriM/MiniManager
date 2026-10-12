package email

import (
	"net/url"
	"strings"
)

// Links builds absolute links into the web app, for the emails.
type Links struct {
	BaseURL string
}

// To returns BaseURL plus path and query, such as https://minis.example.com/reset-password?token=abc.
func (l Links) To(path string, query url.Values) string {
	link := strings.TrimRight(l.BaseURL, "/") + path
	if len(query) > 0 {
		link += "?" + query.Encode()
	}
	return link
}
