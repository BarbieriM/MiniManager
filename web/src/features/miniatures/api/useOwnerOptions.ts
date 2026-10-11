import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { useSession } from '../../auth/lib/useSession'
import type { OwnerOption } from './OwnerOption'

// useOwnerOptions loads the active Users for the Admin's owner picker; it does nothing for Members.
export function useOwnerOptions(): UseQueryResult<OwnerOption[]> {
  const { user, request } = useSession()
  return useQuery({
    queryKey: queryKeys.ownerOptions,
    queryFn: async () => (await request<{ items: OwnerOption[] }>('/users/options')).items,
    enabled: user.role === 'admin',
  })
}
