import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { useSession } from '../../auth/lib/useSession'
import type { SentInvite } from './SentInvite'

// useResendInvite gives an invite a new link and 7 more days; the old link stops working (Card 1 rule 4).
export function useResendInvite(): UseMutationResult<SentInvite, Error, string> {
  const { request } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<SentInvite>(`/admin/invites/${id}/resend`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invites }),
  })
}
