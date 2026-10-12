import { requestJson } from '../../../shared/api/requestJson'

// requestPasswordReset asks for a reset email (Card 2 rule 7). The answer is the same for every email.
export async function requestPasswordReset(email: string): Promise<void> {
  await requestJson<{ message: string }>('/auth/password-reset', { method: 'POST', body: { email } })
}
