import type { ReactElement } from 'react'
import { useNavigate } from 'react-router'
import { ApiProblem } from '../../../shared/api/ApiProblem'
import { Button, Dialog, MessageBox } from '../../../shared/ui'
import { useDeleteMiniature } from '../api/useDeleteMiniature'

type DeleteMiniatureDialogProps = {
  open: boolean
  onClose: () => void
  miniature: { id: string; name: string }
}

// DeleteMiniatureDialog is the confirmation Card 5 rule 8 asks for. After deleting it returns to the Catalog.
export function DeleteMiniatureDialog({ open, onClose, miniature }: DeleteMiniatureDialogProps): ReactElement {
  const navigate = useNavigate()
  const deletion = useDeleteMiniature()

  function confirmDelete(): void {
    deletion.mutate(miniature.id, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Delete ${miniature.name}?`}
      isSaving={deletion.isPending}
      actions={
        <>
          <Button onClick={onClose} disabled={deletion.isPending}>
            Cancel
          </Button>
          <Button variant="confirm" onClick={confirmDelete} isLoading={deletion.isPending}>
            {`Delete ${miniature.name}`}
          </Button>
        </>
      }
    >
      <p>This removes {miniature.name} from the Catalog for good. It cannot be undone.</p>
      {deletion.isError && (
        <MessageBox kind="error">{deletion.error instanceof ApiProblem ? deletion.error.detail : 'The miniature could not be deleted. Try again.'}</MessageBox>
      )}
    </Dialog>
  )
}
