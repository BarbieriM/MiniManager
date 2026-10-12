import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { useSession } from '../../auth/lib/useSession'
import type { Invite } from './Invite'

// useInvites loads every Invite, newest first, for the Members page. Admins only.
export function useInvites(): UseQueryResult<Invite[]> {
  const { request } = useSession()
  return useQuery({
    queryKey: queryKeys.invites,
    queryFn: async () => (await request<{ items: Invite[] }>('/admin/invites')).items,
  })
}
