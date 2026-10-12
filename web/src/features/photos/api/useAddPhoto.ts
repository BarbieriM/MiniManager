import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { useSession } from '../../auth/lib/useSession'
import type { Photo } from '../../miniatures/api/Photo'
import type { PhotoUpload } from './PhotoUpload'
import { uploadPhotoFile } from './uploadPhotoFile'
import { useInvalidateMiniature } from './useInvalidateMiniature'

export type NewPhoto = { file: File; onProgress: (percent: number) => void }

// useAddPhoto adds one Photo (Card 7, ADR 0005): the API signs the upload, the browser sends the file straight to
// Cloudinary, then the API checks what arrived and saves it. Each try signs again, so a retry never reuses an
// expired signature.
export function useAddPhoto(miniatureId: string): UseMutationResult<Photo, Error, NewPhoto> {
  const { request } = useSession()
  const invalidate = useInvalidateMiniature(miniatureId)
  return useMutation({
    mutationFn: async ({ file, onProgress }: NewPhoto) => {
      const upload = await request<PhotoUpload>(`/miniatures/${miniatureId}/photos/signature`, { method: 'POST' })
      await uploadPhotoFile(upload, file, onProgress)
      return request<Photo>(`/miniatures/${miniatureId}/photos`, { method: 'POST', body: { photoId: upload.photoId } })
    },
    onSuccess: invalidate,
  })
}
