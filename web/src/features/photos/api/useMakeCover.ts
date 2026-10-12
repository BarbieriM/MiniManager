import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { useSession } from '../../auth/lib/useSession'
import { useInvalidateMiniature } from './useInvalidateMiniature'

// useMakeCover makes one Photo the Miniature's cover (Card 7 rule 3).
export function useMakeCover(miniatureId: string): UseMutationResult<void, Error, string> {
  const { request } = useSession()
  const invalidate = useInvalidateMiniature(miniatureId)
  return useMutation({
    mutationFn: async (photoId: string) => {
      await request<unknown>(`/miniatures/${miniatureId}/photos/${photoId}`, { method: 'PATCH', body: { isCover: true } })
    },
    onSuccess: invalidate,
  })
}
