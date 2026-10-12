import type { Role } from '../../../shared/api/Role'

// SessionUser is the logged-in User as the API describes them.
export type SessionUser = { id: string; displayName: string; role: Role }
