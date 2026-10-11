import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { useDebouncedValue } from '../../../shared/lib/useDebouncedValue'
import { useSession } from '../../auth/lib/useSession'

// useMatchingCount counts the Miniatures matching query, for the phone sheet's "Show N minis" before applying.
// It waits until the filters stop changing for 300 ms, and asks the list for one item to read its total.
export function useMatchingCount(query: URLSearchParams): number | undefined {
  const { request } = useSession()
  const countQuery = new URLSearchParams(query)
  countQuery.delete('page')
  countQuery.delete('sort')
  countQuery.set('pageSize', '1')
  countQuery.sort()
  const settledQuery = useDebouncedValue(countQuery.toString(), 300)
  const matching = useQuery({
    queryKey: queryKeys.miniatures.list(settledQuery),
    queryFn: () => request<{ total: number }>(`/miniatures?${settledQuery}`),
    placeholderData: keepPreviousData,
  })
  return matching.data?.total
}
