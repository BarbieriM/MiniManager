import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { displayNameSchema } from '../../../shared/lib/displayNameSchema'
import { showFieldProblems } from '../../../shared/lib/showFieldProblems'
import { problemMessage } from '../../../shared/lib/problemMessage'
import { AuthLayout, Button, Field, MessageBox, PasswordInput, Skeleton, TextInput } from '../../../shared/ui'
import { passwordSchema } from '../../auth/lib/passwordSchema'
import { useAuth } from '../../auth/lib/useAuth'
import { requestAcceptInvite } from '../api/requestAcceptInvite'
import { useInviteCheck } from '../api/useInviteCheck'

const signUpSchema = z.object({
  displayName: displayNameSchema,
  password: passwordSchema,
})

type SignUpValues = z.infer<typeof signUpSchema>

// AcceptInvitePage is /invite/:token (Card 1): the invite's email, read-only, then a name and a password. Creating
// the account logs the new User in and opens the Catalog.
export function AcceptInvitePage(): ReactElement | null {
  const auth = useAuth()
  const navigate = useNavigate()
  const token = useParams().token ?? ''
  const invite = useInviteCheck(token, auth.status === 'loggedOut')
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), defaultValues: { displayName: '', password: '' } })

  if (auth.status === 'checking') return null
  if (auth.status === 'loggedIn') {
    return (
      <AuthLayout title="Accept your invite">
        <MessageBox kind="info">You're logged in as {auth.user.displayName}. Log out to accept this invite.</MessageBox>
        <Button variant="secondary" fullWidth onClick={() => void auth.logOut()}>
          Log out
        </Button>
      </AuthLayout>
    )
  }

  async function signUp(values: SignUpValues): Promise<void> {
    if (auth.status !== 'loggedOut') return
    setFailure(null)
    try {
      auth.startSession(await requestAcceptInvite(token, values.displayName, values.password))
      navigate('/', { replace: true })
    } catch (error) {
      if (showFieldProblems(error, setError, ['displayName', 'password'])) return
      setFailure(problemMessage(error))
    }
  }

  if (invite.isPending) {
    return (
      <AuthLayout title="Accept your invite">
        <Skeleton variant="card" />
      </AuthLayout>
    )
  }
  if (invite.isError) {
    return (
      <AuthLayout title="Accept your invite">
        <MessageBox kind="error">{problemMessage(invite.error)}</MessageBox>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Accept your invite" intro="Choose the name the group will see and a password.">
      <form noValidate onSubmit={handleSubmit(signUp)} className="grid gap-6">
        {failure && <MessageBox kind="error">{failure}</MessageBox>}
        <div className="grid gap-4">
          <Field label="Email" helpText="Invites are tied to this email.">
            <TextInput type="email" value={invite.data.email} readOnly />
          </Field>
          <Field label="Your name" helpText="2 to 40 characters. It shows on the minis you own." errorMessage={errors.displayName?.message}>
            <TextInput autoComplete="name" disabled={isSubmitting} {...register('displayName')} />
          </Field>
          <Field label="Password" helpText="8 to 72 characters." errorMessage={errors.password?.message}>
            <PasswordInput autoComplete="new-password" disabled={isSubmitting} {...register('password')} />
          </Field>
        </div>
        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
