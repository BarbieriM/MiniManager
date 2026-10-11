import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'
import { useSession } from '../../auth/lib/useSession'

// useTagsInUse loads the tags on at least one Miniature, most used first, for the tag field's suggestions.
export function useTagsInUse(): UseQueryResult<string[]> {
  const { request } = useSession()
  return useQuery({
    queryKey: queryKeys.tagsInUse,
    queryFn: async () => (await request<{ items: { value: string }[] }>('/tags')).items.map((tag) => tag.value),
  })
}
