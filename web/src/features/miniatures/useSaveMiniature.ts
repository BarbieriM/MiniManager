import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useSession } from '../auth/useSession'
import type { Miniature } from './Miniature'
import { queryKeys } from '../../shared/api/queryKeys'
import type { MiniatureRequest } from './MiniatureRequest'

// useSaveMiniature adds a Miniature (no id) or updates one (with id), then refreshes the cached Catalog.
export function useSaveMiniature(id?: string): UseMutationResult<Miniature, Error, MiniatureRequest> {
  const { request } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: MiniatureRequest) =>
      id ? request<Miniature>(`/miniatures/${id}`, { method: 'PUT', body }) : request<Miniature>('/miniatures', { method: 'POST', body }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.miniatures.detail(saved.id), saved)
      await queryClient.invalidateQueries({ queryKey: queryKeys.miniatures.all, refetchType: 'none' })
    },
  })
}
