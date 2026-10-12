import { requestJson } from '../../../shared/api/requestJson'

// confirmPasswordReset sets a new password from a reset link's token (Card 2 rules 8 and 9).
export function confirmPasswordReset(token: string, password: string): Promise<void> {
  return requestJson<void>('/auth/password-reset/confirm', { method: 'POST', body: { token, password } })
}
