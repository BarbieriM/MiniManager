import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { useSession } from '../../auth/lib/useSession'

// useCancelInvite stops an invite's link from working.
export function useCancelInvite(): UseMutationResult<void, Error, string> {
  const { request } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/invites/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invites }),
  })
}
