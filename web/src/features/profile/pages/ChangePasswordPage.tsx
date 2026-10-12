import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { showFieldProblems } from '../../../shared/lib/showFieldProblems'
import { problemMessage } from '../../../shared/lib/problemMessage'
import { Button, Field, MessageBox, MobileHeader, PageBody, PageHeader, PasswordInput } from '../../../shared/ui'
import { passwordSchema } from '../../auth/lib/passwordSchema'
import { useChangePassword } from '../api/useChangePassword'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: passwordSchema,
})

type ChangePasswordValues = z.infer<typeof changePasswordSchema>

// ChangePasswordPage is /profile/password (Card 3 rules 2 and 3). This device stays logged in; the others are
// logged out on their next refresh.
export function ChangePasswordPage(): ReactElement {
  const changePassword = useChangePassword()
  const [outcome, setOutcome] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '' } })

  async function change(values: ChangePasswordValues): Promise<void> {
    setOutcome(null)
    try {
      await changePassword.mutateAsync(values)
      reset()
      setOutcome({ kind: 'ok', message: 'Password changed. Your other devices were logged out.' })
    } catch (error) {
      if (showFieldProblems(error, setError, ['currentPassword', 'newPassword'])) return
      setOutcome({ kind: 'error', message: problemMessage(error) })
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <MobileHeader backLink={{ to: '/profile', label: 'Profile' }} />
      <PageBody>
        <PageHeader title="Change password" />
        <form noValidate onSubmit={handleSubmit(change)} className="grid max-w-105 gap-6">
          {outcome && <MessageBox kind={outcome.kind}>{outcome.message}</MessageBox>}
          <div className="grid gap-4">
            <Field label="Current password" errorMessage={errors.currentPassword?.message}>
              <PasswordInput autoComplete="current-password" disabled={changePassword.isPending} {...register('currentPassword')} />
            </Field>
            <Field label="New password" helpText="8 to 72 characters. Your other devices will be logged out." errorMessage={errors.newPassword?.message}>
              <PasswordInput autoComplete="new-password" disabled={changePassword.isPending} {...register('newPassword')} />
            </Field>
          </div>
          <Button type="submit" variant="primary" isLoading={changePassword.isPending}>
            Change password
          </Button>
        </form>
      </PageBody>
    </div>
  )
}
