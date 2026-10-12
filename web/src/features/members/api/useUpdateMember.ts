import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { useSession } from '../../auth/lib/useSession'
import type { Member } from './Member'
import type { MemberChange } from './MemberChange'

// useUpdateMember changes a User's Role or active state (Card 4 rules 5 and 6). The owner picker lists only
// active Users, so it is refreshed too.
export function useUpdateMember(): UseMutationResult<Member, Error, MemberChange> {
  const { request } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...change }: MemberChange) => request<Member>(`/admin/users/${id}`, { method: 'PATCH', body: change }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.members })
      await queryClient.invalidateQueries({ queryKey: queryKeys.ownerOptions })
    },
  })
}
