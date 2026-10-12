import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { useSession } from '../../auth/lib/useSession'
import type { Member } from './Member'

// useMembers loads every User for the Members page: active ones A to Z, then deactivated ones. Admins only.
export function useMembers(): UseQueryResult<Member[]> {
  const { request } = useSession()
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: async () => (await request<{ items: Member[] }>('/admin/users')).items,
  })
}
