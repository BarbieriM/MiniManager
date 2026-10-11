import { use } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'

// useAuth returns the current Session state; it must be used inside AuthProvider.
export function useAuth(): AuthContextValue {
  const auth = use(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthProvider')
  return auth
}
