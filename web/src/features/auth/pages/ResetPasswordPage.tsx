import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { ApiProblem } from '../../../shared/api/ApiProblem'
import { showFieldProblems } from '../../../shared/lib/showFieldProblems'
import { problemMessage } from '../../../shared/lib/problemMessage'
import { AuthLayout, Button, ButtonLink, Field, MessageBox, PasswordInput } from '../../../shared/ui'
import { confirmPasswordReset } from '../api/confirmPasswordReset'
import { passwordSchema } from '../lib/passwordSchema'

const resetSchema = z.object({ password: passwordSchema })

type ResetValues = z.infer<typeof resetSchema>

// ResetPasswordPage is /reset-password?token= (Card 2 rules 8 and 9). After the new password is set, every
// Session has ended, so it goes to the login page with "Password updated".
export function ResetPasswordPage(): ReactElement {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [failure, setFailure] = useState<{ message: string; isLinkInvalid: boolean } | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: '' } })

  async function reset(values: ResetValues): Promise<void> {
    setFailure(null)
    try {
      await confirmPasswordReset(searchParams.get('token') ?? '', values.password)
      navigate('/login', { replace: true, state: { notice: 'Password updated. Log in with your new password.' } })
    } catch (error) {
      if (showFieldProblems(error, setError, ['password'])) return
      const isLinkInvalid = error instanceof ApiProblem && error.status === 410
      setFailure({ message: problemMessage(error), isLinkInvalid })
    }
  }

  return (
    <AuthLayout title="Choose a new password" intro="Setting a new password logs you out on every device.">
      <form noValidate onSubmit={handleSubmit(reset)} className="grid gap-6">
        {failure && <MessageBox kind="error">{failure.message}</MessageBox>}
        <Field label="New password" helpText="8 to 72 characters." errorMessage={errors.password?.message}>
          <PasswordInput autoComplete="new-password" disabled={isSubmitting} {...register('password')} />
        </Field>
        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          Set new password
        </Button>
        {failure?.isLinkInvalid && (
          <ButtonLink to="/forgot-password" variant="secondary" fullWidth>
            Ask for a new link
          </ButtonLink>
        )}
      </form>
    </AuthLayout>
  )
}
