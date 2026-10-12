import { useState, type ReactElement } from 'react'
import { roleLabels } from '../../../shared/lib/roleLabels'
import { problemMessage } from '../../../shared/lib/problemMessage'
import { Button, DataCell, DataRow, DataTable, Dialog, MessageBox, SectionHeading, Skeleton, StatusPill } from '../../../shared/ui'
import type { Invite } from '../api/Invite'
import { useCancelInvite } from '../api/useCancelInvite'
import { useInvites } from '../api/useInvites'
import { useResendInvite } from '../api/useResendInvite'
import { SentInviteResult } from './SentInviteResult'

// InvitesSection lists every Invite, newest first, with Resend and Cancel on the ones still open (Card 1, clarified
// 2026-10-11). Resending shows the new link, like sending does.
export function InvitesSection(): ReactElement {
  const invites = useInvites()
  const resend = useResendInvite()
  const cancel = useCancelInvite()
  const [isResultOpen, setIsResultOpen] = useState(false)

  async function resendInvite(id: string): Promise<void> {
    try {
      await resend.mutateAsync(id)
      setIsResultOpen(true)
    } catch {
      // The error shows above the table.
    }
  }

  const failure = resend.error ?? cancel.error
  const rowActions = (invite: Invite): ReactElement | null =>
    invite.status === 'pending' || invite.status === 'expired' ? (
      <>
        <Button size="sm" variant="quiet" aria-label={`Resend invite to ${invite.email}`} onClick={() => void resendInvite(invite.id)}>
          Resend
        </Button>
        <Button size="sm" variant="quiet" aria-label={`Cancel invite to ${invite.email}`} onClick={() => cancel.mutate(invite.id)}>
          Cancel
        </Button>
      </>
    ) : null

  return (
    <section aria-labelledby="invites-heading" className="grid gap-3">
      <SectionHeading id="invites-heading">Invites</SectionHeading>
      {failure && <MessageBox kind="error">{problemMessage(failure)}</MessageBox>}
      {invites.isPending && <Skeleton variant="table" />}
      {invites.isError && <MessageBox kind="error">The invites could not be loaded. Try again.</MessageBox>}
      {invites.data && invites.data.length === 0 && <p className="text-ink-2">No invites yet.</p>}
      {invites.data && invites.data.length > 0 && (
        <DataTable
          label="Invites"
          gridTemplateColumns="minmax(160px,1fr) 80px 110px 180px"
          headers={[{ label: 'Email' }, { label: 'Role' }, { label: 'Status' }, { label: '', align: 'end' }]}
        >
          {invites.data.map((invite) => (
            <DataRow key={invite.id}>
              <DataCell>
                <span className="type-mono block truncate">{invite.email}</span>
              </DataCell>
              <DataCell>{roleLabels[invite.role]}</DataCell>
              <DataCell>
                <StatusPill status={invite.status} />
              </DataCell>
              <DataCell align="end">{rowActions(invite)}</DataCell>
            </DataRow>
          ))}
        </DataTable>
      )}
      <Dialog open={isResultOpen && resend.data !== undefined} onClose={() => setIsResultOpen(false)} title="Invite resent" actions={<Button onClick={() => setIsResultOpen(false)}>Done</Button>}>
        {resend.data && <SentInviteResult sent={resend.data} />}
      </Dialog>
    </section>
  )
}
