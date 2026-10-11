import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useSession } from '../auth/useSession'
import { catalogPageSize } from './catalogPageSize'
import { queryKeys } from '../../shared/api/queryKeys'
import type { MiniaturePage } from './MiniaturePage'

// useCatalogPage loads one page of the Catalog, A to Z.
export function useCatalogPage(page: number): UseQueryResult<MiniaturePage> {
  const { request } = useSession()
  return useQuery({
    queryKey: queryKeys.miniatures.page(page),
    queryFn: () => request<MiniaturePage>(`/miniatures?page=${page}&pageSize=${catalogPageSize}`),
  })
}
