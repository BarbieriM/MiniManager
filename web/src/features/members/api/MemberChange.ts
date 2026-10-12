import type { Role } from '../../../shared/api/Role'

// MemberChange is one Members page action: a new Role, or deactivating or reactivating.
export type MemberChange = { id: string } & ({ role: Role } | { active: boolean })
