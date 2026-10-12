import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useSession } from '../../auth/lib/useSession'
import type { MiniatureDetails } from './MiniatureDetails'
import { queryKeys } from '../../../shared/api/queryKeys'

// useMiniature loads one Miniature's details, with its Photos.
export function useMiniature(id: string): UseQueryResult<MiniatureDetails> {
  const { request } = useSession()
  return useQuery({ queryKey: queryKeys.miniatures.detail(id), queryFn: () => request<MiniatureDetails>(`/miniatures/${id}`) })
}
