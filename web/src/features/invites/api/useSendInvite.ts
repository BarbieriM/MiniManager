import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import type { Role } from '../../../shared/api/Role'
import { useSession } from '../../auth/lib/useSession'
import type { SentInvite } from './SentInvite'

export type NewInvite = { email: string; role: Role }

// useSendInvite invites an email (Card 1 rules 1 to 3); a Pending invite to the same email is replaced.
export function useSendInvite(): UseMutationResult<SentInvite, Error, NewInvite> {
  const { request } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (newInvite: NewInvite) => request<SentInvite>('/admin/invites', { method: 'POST', body: newInvite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invites }),
  })
}
