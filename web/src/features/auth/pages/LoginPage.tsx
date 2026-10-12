import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { ApiProblem } from '../../../shared/api/ApiProblem'
import { AuthLayout, Button, ButtonLink, Field, MessageBox, PasswordInput, TextInput } from '../../../shared/ui'
import { useAuth } from '../lib/useAuth'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginValues = z.infer<typeof loginSchema>

// failure is the form-level message after a refused login; isLocked also disables the button (Card 2 rule 3).
type LoginFailure = { message: string; isLocked: boolean }

const unexpectedFailure = 'Something went wrong. Try again.'

// LoginPage is the /login screen: wrong-credentials, locked and loading states (docs/context.md).
// On a failed attempt the email stays and the password is cleared.
export function LoginPage(): ReactElement {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [failure, setFailure] = useState<LoginFailure | null>(null)
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  // Where to go after logging in: the page (and its query) RequireAuth sent the User away from. notice is a
  // message from the page that sent the User here, such as "Password updated" after a reset.
  const { from: fromState, notice } = (location.state as { from?: string; notice?: string } | null) ?? {}
  const destination = fromState && !fromState.startsWith('/login') ? fromState : '/'

  // Also reached right after a successful login, when the Session state changes before navigate runs.
  if (auth.status === 'loggedIn') return <Navigate to={destination} replace />

  // The lock is per email, so typing another email re-enables the button.
  function clearLock(): void {
    if (failure?.isLocked) setFailure(null)
  }

  async function logIn(values: LoginValues): Promise<void> {
    if (auth.status !== 'loggedOut') return
    setFailure(null)
    try {
      await auth.logIn(values.email, values.password)
      navigate(destination, { replace: true })
    } catch (error) {
      setFailure(
        error instanceof ApiProblem
          ? { message: error.detail, isLocked: error.status === 429 }
          : { message: unexpectedFailure, isLocked: false },
      )
      resetField('password')
      setFocus('password')
    }
  }

  return (
    <AuthLayout title="Log in" intro="Use the email your invitation was sent to.">
      <form noValidate onSubmit={handleSubmit(logIn)} className="grid gap-6">
        {notice && !failure && <MessageBox kind="ok">{notice}</MessageBox>}
        {failure && <MessageBox kind="error">{failure.message}</MessageBox>}
        <div className="grid gap-4">
          <Field label="Email" errorMessage={errors.email?.message}>
            <TextInput type="email" autoComplete="email" placeholder="you@example.com" disabled={isSubmitting} {...register('email', { onChange: clearLock })} />
          </Field>
          <Field label="Password" errorMessage={errors.password?.message}>
            <PasswordInput autoComplete="current-password" disabled={isSubmitting} {...register('password')} />
          </Field>
        </div>
        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting} disabled={failure?.isLocked}>
          {isSubmitting ? 'Logging in' : 'Log in'}
        </Button>
        <ButtonLink to="/forgot-password" variant="quiet" fullWidth>
          Forgot password?
        </ButtonLink>
        <p className="type-dense text-ink-2">Invite only. To get an account, ask an admin for an invitation.</p>
      </form>
    </AuthLayout>
  )
}
