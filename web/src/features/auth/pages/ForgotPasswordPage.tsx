import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AuthLayout, Button, ButtonLink, Field, MessageBox, TextInput } from '../../../shared/ui'
import { requestPasswordReset } from '../api/requestPasswordReset'

const forgotSchema = z.object({ email: z.string().trim().min(1, 'Enter your email.') })

type ForgotValues = z.infer<typeof forgotSchema>

// ForgotPasswordPage is /forgot-password (Card 2 rule 7). It always ends on the same confirmation, so the page
// never reveals whether an email has an account.
export function ForgotPasswordPage(): ReactElement {
  const [isSent, setIsSent] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })

  async function send(values: ForgotValues): Promise<void> {
    setFailure(null)
    try {
      await requestPasswordReset(values.email)
      setIsSent(true)
    } catch {
      setFailure('Something went wrong. Try again.')
    }
  }

  if (isSent) {
    return (
      <AuthLayout title="Check your email">
        <MessageBox kind="ok">If that email exists, we sent a link. It works once, for 1 hour.</MessageBox>
        <ButtonLink to="/login" variant="secondary" fullWidth>
          Back to log in
        </ButtonLink>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset your password" intro="Enter your email and we will send you a link to choose a new password.">
      <form noValidate onSubmit={handleSubmit(send)} className="grid gap-6">
        {failure && <MessageBox kind="error">{failure}</MessageBox>}
        <Field label="Email" errorMessage={errors.email?.message}>
          <TextInput type="email" autoComplete="email" placeholder="you@example.com" disabled={isSubmitting} {...register('email')} />
        </Field>
        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          Send reset link
        </Button>
        <ButtonLink to="/login" variant="quiet" fullWidth>
          Back to log in
        </ButtonLink>
      </form>
    </AuthLayout>
  )
}
