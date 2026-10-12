import type { ReactElement } from 'react'
import { problemMessage } from '../../../shared/lib/problemMessage'
import { Button, Dialog, MessageBox } from '../../../shared/ui'
import { useUpdateMember } from '../api/useUpdateMember'
import type { MemberAction } from '../lib/memberActions'

type MemberActionDialogProps = {
  // action is the change to confirm; null closes the dialog.
  action: MemberAction | null
  onClose: () => void
}

// MemberActionDialog confirms a Role change, a deactivation or a reactivation, and shows why the API refused it,
// such as "There must be at least one admin." (Card 4 rule 6).
export function MemberActionDialog({ action, onClose }: MemberActionDialogProps): ReactElement {
  const update = useUpdateMember()

  function close(): void {
    update.reset()
    onClose()
  }

  async function confirm(): Promise<void> {
    if (!action) return
    try {
      await update.mutateAsync(action.change)
      close()
    } catch {
      // The error shows in the dialog.
    }
  }

  return (
    <Dialog
      open={action !== null}
      onClose={close}
      title={action?.title ?? ''}
      isSaving={update.isPending}
      actions={
        <>
          <Button onClick={close} disabled={update.isPending}>
            Cancel
          </Button>
          <Button variant="confirm" onClick={() => void confirm()} isLoading={update.isPending}>
            {action?.confirmLabel}
          </Button>
        </>
      }
    >
      <p>{action?.explanation}</p>
      {update.isError && (
        <MessageBox kind="error">{problemMessage(update.error)}</MessageBox>
      )}
    </Dialog>
  )
}
