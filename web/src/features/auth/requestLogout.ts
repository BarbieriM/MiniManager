import { requestJson } from '../../shared/api/requestJson'

// requestLogout revokes the refresh token and clears its cookie (Card 2 rule 6).
export function requestLogout(): Promise<void> {
  return requestJson<void>('/auth/logout', { method: 'POST' })
}
