// Package challengerating holds the official D&D 5e Challenge Rating values (Card 5 rule 2), shared by the
// miniature form and the Challenge Rating filter.
package challengerating

// IsOfficial reports whether rating is a 5e Challenge Rating: 0, 1/8, 1/4, 1/2 or a whole number from 1 to 30.
func IsOfficial(rating float64) bool {
	switch rating {
	case 0, 0.125, 0.25, 0.5:
		return true
	}
	return rating >= 1 && rating <= 30 && rating == float64(int(rating))
}
