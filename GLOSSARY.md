# Mini Manager

A D&D group's shared catalog of physical miniatures. Each miniature belongs to the player who owns it, and the whole group browses and filters the catalog to pick minis for a session.

## People and access

**Player**:
A real person in the D&D group. A player becomes a User by accepting an Invite.
_Avoid_: Member (for the person), customer

**User**:
A Player's account in Mini Manager. It has exactly one Role.
_Avoid_: Account, profile

**Display name**:
The name a User is shown by across the app, such as on the Miniatures they own. No two Users share one, ignoring case.
_Avoid_: Username, nickname, full name

**Role**:
What a User may do. The only roles are Admin and Member.
_Avoid_: Permission level, group

**Admin**:
The Role that can change any Miniature, send Invites and manage Users.
_Avoid_: Owner (for this role), superuser

**Member**:
The Role that can view the whole Catalog and change only Miniatures they own.
_Avoid_: Player (for this role), viewer

**Invite**:
An emailed, single-use offer to create a User with a given Role. Invites are the only way to sign up. An Invite is Pending until it is Accepted, Cancelled, or Expired (7 days after it was last sent). A new Invite to the same email replaces a Pending one.
_Avoid_: Invitation link, registration

**Deactivated User**:
A User an Admin has switched off: they cannot log in, but their Miniatures stay in the Catalog and stay theirs. An Admin can Reactivate them, which restores the same User; they are never invited again.
_Avoid_: Deleted user, banned, removed

**Members page**:
The Admin's list of every User, of any Role, and every Invite. "Members" is only the page's name; the people on it are Users.
_Avoid_: Member (for the people on this page), user list

**Password reset**:
A single-use emailed link, valid for 1 hour, that lets a User set a new password without the old one. Completing it ends all of that User's Sessions.
_Avoid_: Password recovery, forgot-password token

**Session**:
One login of a User on one device. It lasts until the User logs out, leaves it unused for too long, or resets their password.
_Avoid_: Token family, device, login (as a noun)

## Catalog

**Catalog**:
The one shared list of every Miniature, from all Owners.
_Avoid_: Collection, inventory, library

**Miniature**:
A physical figure, or a set of identical figures, entered once in the Catalog. "Mini" is fine in UI copy.
_Avoid_: Figure, model, item

**Owner**:
The User a Miniature belongs to, who physically holds it.
_Avoid_: Creator, holder

**Paint status**:
How a Miniature is painted. It is one of Pre-painted, Hand-painted or Unpainted.
_Avoid_: Paint state, finish, Not painted

**Tag**:
A free label on a Miniature, optionally namespaced as `namespace:value` (for example `faction:drow`).
_Avoid_: Label, keyword, category

**Cover photo**:
The one Photo of a Miniature that represents it in lists.
_Avoid_: Thumbnail (that is only its display size), main image
