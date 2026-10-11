import { requestJson } from '../../shared/api/requestJson'
import type { SessionResponse } from './SessionResponse'

// requestLogin starts a Session; the server sets the refresh cookie.
export function requestLogin(email: string, password: string): Promise<SessionResponse> {
  return requestJson<SessionResponse>('/auth/login', { method: 'POST', body: { email, password } })
}
