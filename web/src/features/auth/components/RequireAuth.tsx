import type { ReactElement } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/useAuth'

// RequireAuth shows its child routes only to a logged-in User and sends everyone else to /login, remembering the
// path and query (filters live in the query) to return to afterwards.
// While the Session is being restored it renders nothing; the waking-server banner covers slow starts.
export function RequireAuth(): ReactElement | null {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'checking') return null
  if (auth.status === 'loggedOut') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
