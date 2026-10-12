import type { Role } from '../../../shared/api/Role'
import type { InviteStatus } from '../../../shared/ui'

// Invite is one Invite as the Members page lists it (Card 1).
export type Invite = {
  id: string
  email: string
  role: Role
  status: InviteStatus
  expiresAt: string
  createdAt: string
}
