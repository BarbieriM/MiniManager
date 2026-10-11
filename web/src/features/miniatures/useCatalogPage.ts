import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryKeys'
import { useSession } from '../auth/useSession'
import { catalogPageSize } from './catalogPageSize'
import type { MiniaturePage } from './MiniaturePage'

// useCatalogPage loads the Catalog page that query (the URL's filters, sort and page) describes. The previous page
// stays on screen while the next one loads, so the list does not flash empty on every filter change.
export function useCatalogPage(query: URLSearchParams): UseQueryResult<MiniaturePage> {
  const { request } = useSession()
  const listQuery = new URLSearchParams(query)
  if (!listQuery.has('pageSize')) listQuery.set('pageSize', String(catalogPageSize))
  listQuery.sort()
  const queryString = listQuery.toString()
  return useQuery({
    queryKey: queryKeys.miniatures.list(queryString),
    queryFn: () => request<MiniaturePage>(`/miniatures?${queryString}`),
    placeholderData: keepPreviousData,
  })
}
