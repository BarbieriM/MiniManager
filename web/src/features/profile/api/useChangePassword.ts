import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { useSession } from '../../auth/lib/useSession'

export type PasswordChange = { currentPassword: string; newPassword: string }

// useChangePassword changes the logged-in User's password (Card 3 rules 2 and 3). The endpoint is under /auth so
// the browser sends the refresh cookie, which tells the API which Session to keep.
export function useChangePassword(): UseMutationResult<void, Error, PasswordChange> {
  const { request } = useSession()
  return useMutation({
    mutationFn: (change: PasswordChange) => request<void>('/auth/password', { method: 'POST', body: change }),
  })
}
