import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { requestJson } from '../../../shared/api/requestJson'

// useInviteCheck asks whether an invite link still works and which email it is for (Card 1 rule 5). It needs no
// login. enabled is false while someone is logged in, who must log out first.
export function useInviteCheck(token: string, enabled: boolean): UseQueryResult<{ email: string }> {
  return useQuery({
    queryKey: queryKeys.inviteCheck(token),
    queryFn: () => requestJson<{ email: string }>(`/invites/${encodeURIComponent(token)}`),
    enabled,
  })
}
