import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { useSession } from '../../auth/lib/useSession'
import { catalogPageSize } from '../lib/catalogPageSize'
import type { MiniatureListResponse } from './MiniatureListResponse'

// useCatalogPage loads the Catalog page that query (the URL's filters, sort and page) describes. The previous page
// stays on screen while the next one loads, so the list does not flash empty on every filter change.
export function useCatalogPage(query: URLSearchParams): UseQueryResult<MiniatureListResponse> {
  const { request } = useSession()
  const listQuery = new URLSearchParams(query)
  // The view (table or grid) is the screen's own choice, not something the API filters by.
  listQuery.delete('view')
  if (!listQuery.has('pageSize')) listQuery.set('pageSize', String(catalogPageSize))
  listQuery.sort()
  const queryString = listQuery.toString()
  return useQuery({
    queryKey: queryKeys.miniatures.list(queryString),
    queryFn: () => request<MiniatureListResponse>(`/miniatures?${queryString}`),
    placeholderData: keepPreviousData,
  })
}
