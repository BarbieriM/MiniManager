import type { ReactElement } from 'react'
import { problemMessage } from '../../../shared/lib/problemMessage'
import { Button, Dialog, MessageBox } from '../../../shared/ui'
import { useRemovePhoto } from '../api/useRemovePhoto'

type RemovePhotoDialogProps = {
  miniatureId: string
  // photoId is the Photo to remove; null closes the dialog.
  photoId: string | null
  onClose: () => void
}

// RemovePhotoDialog asks before a Photo is removed for good (step 5 planning, Q19).
export function RemovePhotoDialog({ miniatureId, photoId, onClose }: RemovePhotoDialogProps): ReactElement {
  const removal = useRemovePhoto(miniatureId)

  function close(): void {
    removal.reset()
    onClose()
  }

  async function confirm(): Promise<void> {
    if (!photoId) return
    try {
      await removal.mutateAsync(photoId)
      close()
    } catch {
      // The error shows in the dialog.
    }
  }

  return (
    <Dialog
      open={photoId !== null}
      onClose={close}
      title="Remove this photo?"
      isSaving={removal.isPending}
      actions={
        <>
          <Button onClick={close} disabled={removal.isPending}>
            Cancel
          </Button>
          <Button variant="confirm" onClick={() => void confirm()} isLoading={removal.isPending}>
            Remove photo
          </Button>
        </>
      }
    >
      <p>This cannot be undone. If it is the cover, the next photo becomes the cover.</p>
      {removal.isError && <MessageBox kind="error">{problemMessage(removal.error)}</MessageBox>}
    </Dialog>
  )
}
