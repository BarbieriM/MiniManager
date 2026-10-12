import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useLocation } from 'react-router'
import { ApiProblem } from '../../../shared/api/ApiProblem'
import { getPhotoError, maxPhotos } from '../../../shared/lib/getPhotoError'
import { photoAltText } from '../../../shared/lib/photoAltText'
import { PhotoSlot, SectionHeading } from '../../../shared/ui'
import type { MiniatureDetails } from '../../miniatures/api/MiniatureDetails'
import { useAddPhoto } from '../api/useAddPhoto'
import { useMakeCover } from '../api/useMakeCover'
import { RemovePhotoDialog } from './RemovePhotoDialog'

// PendingPhoto is the one upload in progress, or why the last one did not work. file is kept for Retry after any
// server or network failure; a file refused in the browser has none, because retrying it would fail the same way.
type PendingPhoto = { state: 'uploading'; progress: number } | { state: 'error'; message: string; file: File | null }

const uploadFailedMessage = 'The upload did not finish. Check your connection and try again.'

// whyNotAdded is the message for a failed add: the API's Card 7 message when it refused, otherwise a network one.
function whyNotAdded(error: unknown): string {
  if (error instanceof ApiProblem) return error.fieldProblems[0]?.message ?? error.detail
  return uploadFailedMessage
}

// PhotosSection is the edit page's Photos (Card 7): up to 3 slots, each Photo uploading as soon as it is picked,
// independently of the form's Save. The first Photo becomes the cover; another can be chosen, and Photos can be
// removed after confirming.
export function PhotosSection({ miniature }: { miniature: MiniatureDetails }): ReactElement {
  const addPhoto = useAddPhoto(miniature.id)
  const makeCover = useMakeCover(miniature.id)
  const [pending, setPending] = useState<PendingPhoto | null>(null)
  const [photoToRemove, setPhotoToRemove] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const location = useLocation()

  // "Add photos" on the details page links to #photos; React Router does not scroll to it by itself.
  useEffect(() => {
    if (location.hash === '#photos') sectionRef.current?.scrollIntoView?.()
  }, [location.hash])

  async function add(file: File): Promise<void> {
    const problem = getPhotoError(file, miniature.photos.length)
    if (problem) {
      setPending({ state: 'error', message: problem, file: null })
      return
    }
    setPending({ state: 'uploading', progress: 0 })
    try {
      await addPhoto.mutateAsync({ file, onProgress: (progress) => setPending({ state: 'uploading', progress }) })
      setPending(null)
    } catch (error) {
      setPending({ state: 'error', message: whyNotAdded(error), file })
    }
  }

  const emptySlots = maxPhotos - miniature.photos.length - (pending ? 1 : 0)

  return (
    <section ref={sectionRef} id="photos" aria-labelledby="photos-heading" className="grid max-w-160 gap-3">
      <SectionHeading id="photos-heading">Photos</SectionHeading>
      <p className="type-dense text-ink-2">Up to 3 photos, JPEG, PNG or WebP, 5 MB each. The first one is the cover.</p>
      <div className="flex flex-wrap gap-3">
        {miniature.photos.map((photo, index) => (
          <PhotoSlot
            key={photo.id}
            state="uploaded"
            creatureSize={miniature.size}
            imageUrl={photo.thumbnailUrl}
            alt={photoAltText(miniature.name, index)}
            isCover={photo.isCover}
            onSetCover={() => makeCover.mutate(photo.id)}
            onRemove={() => setPhotoToRemove(photo.id)}
          />
        ))}
        {pending?.state === 'uploading' && <PhotoSlot state="uploading" creatureSize={miniature.size} progress={pending.progress} />}
        {pending?.state === 'error' && <FailedPhotoSlot pending={pending} onRetry={(file) => void add(file)} onDismiss={() => setPending(null)} />}
        {Array.from({ length: Math.max(emptySlots, 0) }, (_, index) => (
          <PhotoSlot
            key={`empty-${index}`}
            state="empty"
            creatureSize={miniature.size}
            disabled={pending?.state === 'uploading'}
            onFiles={(files) => {
              if (files[0]) void add(files[0])
            }}
          />
        ))}
      </div>
      <RemovePhotoDialog miniatureId={miniature.id} photoId={photoToRemove} onClose={() => setPhotoToRemove(null)} />
    </section>
  )
}

type FailedPhotoSlotProps = {
  pending: Extract<PendingPhoto, { state: 'error' }>
  onRetry: (file: File) => void
  onDismiss: () => void
}

// FailedPhotoSlot shows why a Photo was not added, with Retry when the same file can be tried again.
function FailedPhotoSlot({ pending, onRetry, onDismiss }: FailedPhotoSlotProps): ReactElement {
  const { file } = pending
  return <PhotoSlot state="error" message={pending.message} onRetry={file ? () => onRetry(file) : undefined} onDismiss={onDismiss} />
}
