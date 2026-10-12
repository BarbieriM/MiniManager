import { requestJson } from '../../../shared/api/requestJson'
import type { SessionResponse } from '../../auth/api/SessionResponse'

// requestAcceptInvite creates the account from an invite and starts its Session (Card 1 rule 6).
export function requestAcceptInvite(token: string, displayName: string, password: string): Promise<SessionResponse> {
  return requestJson<SessionResponse>(`/invites/${encodeURIComponent(token)}/accept`, { method: 'POST', body: { displayName, password } })
}
