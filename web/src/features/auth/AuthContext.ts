import { createContext } from 'react'
import type { AuthorizedRequest } from './AuthorizedRequest'
import type { SessionUser } from './SessionUser'

// AuthContextValue is the logged-in state. accessToken lives only in memory (CLAUDE.md, Auth and security).
export type AuthContextValue =
  | { status: 'checking' }
  | { status: 'loggedOut'; logIn: (email: string, password: string) => Promise<void> }
  | { status: 'loggedIn'; user: SessionUser; request: AuthorizedRequest; logOut: () => Promise<void> }

export const AuthContext = createContext<AuthContextValue | null>(null)
