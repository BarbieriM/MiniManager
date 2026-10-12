import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { useSession } from '../../auth/lib/useSession'
import { useInvalidateMiniature } from './useInvalidateMiniature'

// useRemovePhoto removes one Photo and its file (Card 7 rule 6); the next Photo becomes the cover if needed.
export function useRemovePhoto(miniatureId: string): UseMutationResult<void, Error, string> {
  const { request } = useSession()
  const invalidate = useInvalidateMiniature(miniatureId)
  return useMutation({
    mutationFn: (photoId: string) => request<void>(`/miniatures/${miniatureId}/photos/${photoId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}
