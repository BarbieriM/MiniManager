import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useSession } from '../../auth/lib/useSession'
import { queryKeys } from '../../../shared/api/queryKeys'

// useDeleteMiniature deletes a Miniature for good (Card 5 rule 8) and drops it from every cached Catalog page.
export function useDeleteMiniature(): UseMutationResult<void, Error, string> {
  const { request } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<void>(`/miniatures/${id}`, { method: 'DELETE' }),
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.miniatures.detail(id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.miniatures.all })
      // Counts and tags in use change with every delete.
      await queryClient.invalidateQueries({ queryKey: queryKeys.filterDefinitions })
      await queryClient.invalidateQueries({ queryKey: queryKeys.tagsInUse })
    },
  })
}
