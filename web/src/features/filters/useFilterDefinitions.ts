import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '../../shared/api/queryKeys'
import { useSession } from '../auth/useSession'
import type { FilterDefinition } from './FilterDefinition'

// useFilterDefinitions loads the filter definitions and their whole-Catalog counts.
export function useFilterDefinitions(): UseQueryResult<FilterDefinition[]> {
  const { request } = useSession()
  return useQuery({ queryKey: queryKeys.filterDefinitions, queryFn: () => request<FilterDefinition[]>('/filters') })
}
