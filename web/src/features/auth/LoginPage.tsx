import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { ApiProblem } from '../../shared/api/ApiProblem'
import { Button, Field, MessageBox, PasswordInput, TextInput, Wordmark } from '../../shared/ui'
import { useAuth } from './useAuth'

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

  if (auth.status === 'loggedIn') return <Navigate to="/" replace />

  // The lock is per email, so typing another email re-enables the button.
  function clearLock(): void {
    if (failure?.isLocked) setFailure(null)
  }

  async function logIn(values: LoginValues): Promise<void> {
    if (auth.status !== 'loggedOut') return
    setFailure(null)
    try {
      await auth.logIn(values.email, values.password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
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
    <main className="grid min-h-dvh md:grid-cols-2">
      <aside className="hidden border-r border-rule-strong bg-sunken p-12 md:block">
        <Wordmark size="lg" />
      </aside>
      <div className="flex flex-col gap-8 px-4 py-8 md:justify-center md:px-12">
        <div className="md:hidden">
          <Wordmark size="lg" />
        </div>
        <form noValidate onSubmit={handleSubmit(logIn)} className="grid w-full max-w-105 gap-6">
          <div className="grid gap-2">
            <h1 className="type-display-m md:type-display">Log in</h1>
            <p className="text-ink-2">Use the email your invitation was sent to.</p>
          </div>
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
          <p className="type-dense text-ink-2">Invite only. To get an account, ask an admin for an invitation.</p>
        </form>
      </div>
    </main>
  )
}
