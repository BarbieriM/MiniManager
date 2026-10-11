import type { ReactElement } from 'react'
import { Outlet } from 'react-router'
import { AuthProvider } from '../features/auth/AuthProvider'
import { useIsServerWaking } from '../shared/api/useIsServerWaking'
import { Banner } from '../shared/ui'

// AppRoot wraps every route: the Session, and the waking-server banner for Render's cold starts.
export function AppRoot(): ReactElement {
  const isServerWaking = useIsServerWaking()
  return (
    <AuthProvider>
      {isServerWaking && (
        <Banner icon="clock" showProgress>
          Waking the server. This can take up to a minute.
        </Banner>
      )}
      <Outlet />
    </AuthProvider>
  )
}
