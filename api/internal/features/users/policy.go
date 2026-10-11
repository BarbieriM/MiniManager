package users

import "github.com/google/uuid"

// This file is the one place that decides who may do what (Card 4, CLAUDE.md "Permissions"). Every check runs on
// the server for every request; the UI only hides buttons using these answers.

// CanChangeMiniature reports whether actor may edit or delete a Miniature owned by ownerID: its Owner or any
// Admin (Card 4 rules 3 and 4).
func CanChangeMiniature(actor User, ownerID uuid.UUID) bool {
	return actor.Active && (actor.Role == RoleAdmin || actor.ID == ownerID)
}

// CanChooseOwner reports whether actor may set a Miniature's Owner to someone else: Admins only (Card 4 rule 4).
func CanChooseOwner(actor User) bool {
	return actor.Active && actor.Role == RoleAdmin
}
