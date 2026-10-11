import type { AuthorizedRequest } from './AuthorizedRequest'
import type { SessionUser } from './SessionUser'
import { useAuth } from './useAuth'

// useSession returns the logged-in User and the authorized request. Only screens behind RequireAuth may use it.
export function useSession(): { user: SessionUser; request: AuthorizedRequest } {
  const auth = useAuth()
  if (auth.status !== 'loggedIn') throw new Error('useSession must be used behind RequireAuth')
  return { user: auth.user, request: auth.request }
}
