import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { displayNameSchema } from '../../../shared/lib/displayNameSchema'
import { initialsFromDisplayName } from '../../../shared/lib/initialsFromDisplayName'
import { showFieldProblems } from '../../../shared/lib/showFieldProblems'
import { problemMessage } from '../../../shared/lib/problemMessage'
import { BottomBar, Button, Field, MobileHeader, OwnerStamp, PageBody, RowLinkList, TextInput, useToast } from '../../../shared/ui'
import { useAuth } from '../../auth/lib/useAuth'
import { useUpdateProfile } from '../api/useUpdateProfile'

const profileSchema = z.object({ displayName: displayNameSchema })

type ProfileValues = z.infer<typeof profileSchema>

// ProfilePage is /profile (Card 3): the User's name, which they can change, then Change password, Members for
// Admins (on phones Members lives here, docs/context.md) and Log out.
export function ProfilePage(): ReactElement | null {
  const auth = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const updateProfile = useUpdateProfile()
  const displayName = auth.status === 'loggedIn' ? auth.user.displayName : ''
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), values: { displayName } })
  if (auth.status !== 'loggedIn') return null

  async function logOut(): Promise<void> {
    if (auth.status !== 'loggedIn') return
    await auth.logOut()
    navigate('/login', { replace: true })
  }

  async function save(values: ProfileValues): Promise<void> {
    try {
      await updateProfile.mutateAsync(values.displayName)
      toast.show('ok', 'Profile saved')
    } catch (error) {
      if (showFieldProblems(error, setError, ['displayName'])) return
      toast.show('error', problemMessage(error))
    }
  }

  const rows = [
    { label: 'Change password', to: '/profile/password' },
    ...(auth.user.role === 'admin' ? [{ label: 'Members', to: '/admin/members' }] : []),
    { label: 'Log out', onClick: () => void logOut() },
  ]

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MobileHeader />
      <PageBody>
        <div className="flex items-center gap-4">
          <OwnerStamp initials={initialsFromDisplayName(auth.user.displayName)} isCurrentUser size="lg" />
          <h1 className="type-display-m md:type-display">{auth.user.displayName}</h1>
        </div>
        <form noValidate onSubmit={handleSubmit(save)} className="grid max-w-105 gap-4">
          <Field label="Name" helpText="2 to 40 characters. It shows on the minis you own." errorMessage={errors.displayName?.message}>
            <TextInput autoComplete="name" disabled={updateProfile.isPending} {...register('displayName')} />
          </Field>
          <Button type="submit" variant="secondary" isLoading={updateProfile.isPending}>
            Save
          </Button>
        </form>
        <div className="max-w-105">
          <RowLinkList items={rows} />
        </div>
      </PageBody>
      <BottomBar className="sticky bottom-0" />
    </div>
  )
}
