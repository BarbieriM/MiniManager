import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/api/queryKeys'

// useInvalidateMiniature returns a function that refreshes one Miniature's details and every Catalog page, after
// its Photos change (the list shows each cover).
export function useInvalidateMiniature(miniatureId: string): () => Promise<void> {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.miniatures.detail(miniatureId) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.miniatures.all })
  }
}
