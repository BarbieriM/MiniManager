import type { ReactElement } from 'react'
import { LinkBox, MessageBox } from '../../../shared/ui'
import type { SentInvite } from '../api/SentInvite'

// SentInviteResult says whether the invite email went out, and always shows the link to copy, because it exists
// only now (Card 1 edge case: the email service is down).
export function SentInviteResult({ sent }: { sent: SentInvite }): ReactElement {
  return (
    <>
      {sent.emailSent ? (
        <MessageBox kind="ok">Invite sent to {sent.email}.</MessageBox>
      ) : (
        <MessageBox kind="error">The email could not be sent. Copy the link and send it yourself.</MessageBox>
      )}
      <LinkBox url={sent.link} />
      <p className="type-dense text-ink-2">The link works once and expires in 7 days. You can also share it by chat.</p>
    </>
  )
}
