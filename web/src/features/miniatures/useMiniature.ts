import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useSession } from '../auth/useSession'
import type { Miniature } from './Miniature'
import { queryKeys } from '../../shared/api/queryKeys'

// useMiniature loads one Miniature's details.
export function useMiniature(id: string): UseQueryResult<Miniature> {
  const { request } = useSession()
  return useQuery({ queryKey: queryKeys.miniatures.detail(id), queryFn: () => request<Miniature>(`/miniatures/${id}`) })
}
