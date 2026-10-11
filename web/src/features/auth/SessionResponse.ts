import type { SessionUser } from './SessionUser'

// SessionResponse is what login and refresh return (Card 2 rule 4). The refresh token travels only in its
// httpOnly cookie and is never visible here.
export type SessionResponse = { accessToken: string; expiresIn: number; user: SessionUser }
