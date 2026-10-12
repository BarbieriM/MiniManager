import { createContext } from 'react'
import type { AuthorizedRequest } from '../api/AuthorizedRequest'
import type { SessionResponse } from '../api/SessionResponse'
import type { SessionUser } from '../api/SessionUser'

// AuthContextValue is the logged-in state. accessToken lives only in memory (CLAUDE.md, Auth and security).
export type AuthContextValue =
  | { status: 'checking' }
  | {
      status: 'loggedOut'
      logIn: (email: string, password: string) => Promise<void>
      // startSession logs in with a Session the API already started, such as after accepting an Invite.
      startSession: (session: SessionResponse) => void
    }
  | {
      status: 'loggedIn'
      user: SessionUser
      request: AuthorizedRequest
      logOut: () => Promise<void>
      // updateUser replaces the logged-in User's details after they change them, such as their name.
      updateUser: (user: SessionUser) => void
    }

export const AuthContext = createContext<AuthContextValue | null>(null)
