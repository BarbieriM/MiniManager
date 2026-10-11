import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { ApiProblem } from '../../shared/api/ApiProblem'
import { requestJson } from '../../shared/api/requestJson'
import { AuthContext, type AuthContextValue } from './AuthContext'
import type { AuthorizedRequest } from './AuthorizedRequest'
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
  // The latest access token, readable from requests already in flight.
  const accessTokenRef = useRef<string | null>(null)
  // A refresh in progress, shared by every request that got a 401 meanwhile, so the cookie rotates once.
  const refreshingRef = useRef<Promise<SessionResponse> | null>(null)

  const logInWith = useCallback((session: SessionResponse): void => {
    accessTokenRef.current = session.accessToken
    setState({ status: 'loggedIn', session })
  }, [])

  const forgetSession = useCallback((): void => {
    accessTokenRef.current = null
    setState({ status: 'loggedOut' })
  }, [])

  useEffect(() => {
    restoreRef.current ??= requestRefresh().then(logInWith, (error: unknown) => {
      if (!(error instanceof ApiProblem)) console.error('restore session:', error)
      forgetSession()
    })
  }, [logInWith, forgetSession])

  const request = useCallback<AuthorizedRequest>(
    async <Result,>(path: string, options: Parameters<AuthorizedRequest>[1] = {}): Promise<Result> => {
      try {
        return await requestJson<Result>(path, { ...options, accessToken: accessTokenRef.current ?? undefined })
      } catch (error) {
        if (!(error instanceof ApiProblem && error.status === 401)) throw error
        let session: SessionResponse
        try {
          refreshingRef.current ??= requestRefresh().finally(() => (refreshingRef.current = null))
          session = await refreshingRef.current
        } catch (refreshError) {
          // Only the server saying no ends the Session; RequireAuth then sends the User to /login and back here.
          // A network failure, such as Render still waking up, leaves the User logged in to try again.
          if (refreshError instanceof ApiProblem && refreshError.status === 401) forgetSession()
          throw refreshError
        }
        logInWith(session)
        return requestJson<Result>(path, { ...options, accessToken: session.accessToken })
      }
    },
    [logInWith, forgetSession],
  )

  const logIn = useCallback(async (email: string, password: string): Promise<void> => {
    logInWith(await requestLogin(email, password))
  }, [logInWith])

  const logOut = useCallback(async (): Promise<void> => {
    try {
      await requestLogout()
    } finally {
      // Forget the access token even if the request failed; the cookie expires on its own.
      forgetSession()
    }
  }, [forgetSession])

  const value = useMemo((): AuthContextValue => {
    if (state.status === 'loggedIn') {
      return { status: 'loggedIn', user: state.session.user, request, logOut }
    }
    if (state.status === 'loggedOut') return { status: 'loggedOut', logIn }
    return { status: 'checking' }
  }, [state, logIn, logOut, request])

  return <AuthContext value={value}>{children}</AuthContext>
}
