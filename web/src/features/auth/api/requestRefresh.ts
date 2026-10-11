import { ApiProblem } from '../../../shared/api/ApiProblem'
import { requestJson } from '../../../shared/api/requestJson'
import type { SessionResponse } from './SessionResponse'

function refreshOnce(): Promise<SessionResponse> {
  return requestJson<SessionResponse>('/auth/refresh', { method: 'POST' })
}

// requestRefresh trades the refresh cookie for a new access token. A 401 is retried once: when two tabs refresh
// at the same moment, the second one's cookie was just rotated, and the retry sends the new cookie (ADR 0002).
export async function requestRefresh(): Promise<SessionResponse> {
  try {
    return await refreshOnce()
  } catch (error) {
    if (error instanceof ApiProblem && error.status === 401) return refreshOnce()
    throw error
  }
}
