// SessionUser is the logged-in User as the API describes them.
export type SessionUser = { id: string; displayName: string; role: 'admin' | 'member' }
