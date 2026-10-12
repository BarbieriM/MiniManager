import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import type { SessionUser } from '../../auth/api/SessionUser'
import { useAuth } from '../../auth/lib/useAuth'
import { useSession } from '../../auth/lib/useSession'

// useUpdateProfile saves the logged-in User's name (Card 3 rule 1). The new name shows at once in the app bar,
// and every cached list that names Owners is refreshed (Card 3 acceptance criterion 1).
export function useUpdateProfile(): UseMutationResult<SessionUser, Error, string> {
  const { request } = useSession()
  const auth = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (displayName: string) => request<SessionUser>('/me', { method: 'PATCH', body: { displayName } }),
    onSuccess: async (user) => {
      if (auth.status === 'loggedIn') auth.updateUser({ id: user.id, displayName: user.displayName, role: user.role })
      await queryClient.invalidateQueries({ queryKey: queryKeys.miniatures.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.ownerOptions })
      await queryClient.invalidateQueries({ queryKey: queryKeys.filterDefinitions })
    },
  })
}
