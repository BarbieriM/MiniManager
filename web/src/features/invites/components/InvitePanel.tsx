import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactElement } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ApiProblem } from '../../../shared/api/ApiProblem'
import { showFieldProblems } from '../../../shared/lib/showFieldProblems'
import { Button, Field, MessageBox, ModalPanel, Segmented, TextInput } from '../../../shared/ui'
import { useSendInvite } from '../api/useSendInvite'
import { SentInviteResult } from './SentInviteResult'

const inviteSchema = z.object({
  email: z.string().trim().min(1, 'Enter an email.'),
  role: z.enum(['member', 'admin']),
})

type InviteValues = z.infer<typeof inviteSchema>

type InvitePanelProps = {
  open: boolean
  onClose: () => void
}

// InvitePanel invites someone by email with a Role, Member by default (Card 1), then shows the link to copy, in a
// ModalPanel: a Dialog on desktops, a bottom Sheet on phones.
export function InvitePanel({ open, onClose }: InvitePanelProps): ReactElement {
  const sendInvite = useSendInvite()
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: '', role: 'member' } })
  const role = useWatch({ control, name: 'role' })

  function close(): void {
    sendInvite.reset()
    reset()
    onClose()
  }

  async function send(values: InviteValues): Promise<void> {
    try {
      await sendInvite.mutateAsync(values)
    } catch (error) {
      showFieldProblems(error, setError, ['email', 'role'])
    }
  }

  const sent = sendInvite.data
  const otherFailure = sendInvite.error instanceof ApiProblem && sendInvite.error.fieldProblems.length === 0 ? sendInvite.error.detail : null

  const actions = (
    sent ? (
      <Button onClick={close}>Done</Button>
    ) : (
      <>
        <Button onClick={close} disabled={sendInvite.isPending}>
          Cancel
        </Button>
        <Button variant="primary" form="invite-form" type="submit" isLoading={sendInvite.isPending}>
          Send invite
        </Button>
      </>
    )
  )
  const content = sent ? (
    <SentInviteResult sent={sent} />
  ) : (
    <form id="invite-form" noValidate onSubmit={handleSubmit(send)} className="grid gap-4">
      {otherFailure && <MessageBox kind="error">{otherFailure}</MessageBox>}
      <Field label="Email" errorMessage={errors.email?.message}>
        <TextInput type="email" autoComplete="off" placeholder="name@example.com" disabled={sendInvite.isPending} {...register('email')} />
      </Field>
      <Segmented
        label="Role"
        options={[
          { value: 'member', label: 'Member' },
          { value: 'admin', label: 'Admin' },
        ]}
        value={role}
        onChange={(role) => setValue('role', role)}
        fullWidth
      />
    </form>
  )

  return (
    <ModalPanel open={open} onClose={close} title="Invite someone" isSaving={sendInvite.isPending} actions={actions}>
      {content}
    </ModalPanel>
  )
}
