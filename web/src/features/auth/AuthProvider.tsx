import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { ApiProblem } from '../../shared/api/ApiProblem'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { requestLogin } from './requestLogin'
import { requestLogout } from './requestLogout'
import { requestRefresh } from './requestRefresh'
import type { SessionResponse } from './SessionResponse'

type SessionState = { status: 'checking' } | { status: 'loggedOut' } | { status: 'loggedIn'; session: SessionResponse }

// AuthProvider restores the Session from the refresh cookie on load, so a page reload keeps the User logged in
// (Card 2 acceptance criterion 1), and offers log in and log out.
export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [state, setState] = useState<SessionState>({ status: 'checking' })
  // One restore per page load, even when React StrictMode runs effects twice in development.
  const restoreRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    restoreRef.current ??= requestRefresh().then(
      (session) => setState({ status: 'loggedIn', session }),
      (error: unknown) => {
        if (!(error instanceof ApiProblem)) console.error('restore session:', error)
        setState({ status: 'loggedOut' })
      },
    )
  }, [])

  const logIn = useCallback(async (email: string, password: string): Promise<void> => {
    const session = await requestLogin(email, password)
    setState({ status: 'loggedIn', session })
  }, [])

  const logOut = useCallback(async (): Promise<void> => {
    try {
      await requestLogout()
    } finally {
      // Forget the access token even if the request failed; the cookie expires on its own.
      setState({ status: 'loggedOut' })
    }
  }, [])

  const value = useMemo((): AuthContextValue => {
    if (state.status === 'loggedIn') {
      return { status: 'loggedIn', user: state.session.user, accessToken: state.session.accessToken, logOut }
    }
    if (state.status === 'loggedOut') return { status: 'loggedOut', logIn }
    return { status: 'checking' }
  }, [state, logIn, logOut])

  return <AuthContext value={value}>{children}</AuthContext>
}
