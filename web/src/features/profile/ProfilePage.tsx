import type { ReactElement } from 'react'
import { useNavigate } from 'react-router'
import { initialsFromDisplayName } from '../../shared/lib/initialsFromDisplayName'
import { BottomBar, MobileHeader, OwnerStamp, RowLinkList } from '../../shared/ui'
import { useAuth } from '../auth/useAuth'

// ProfilePage is /profile. In build step 2 it only holds the User's name and Log out, where docs/context.md puts
// Log out on phones; editing the profile and the password come with Card 3.
export function ProfilePage(): ReactElement | null {
  const auth = useAuth()
  const navigate = useNavigate()
  if (auth.status !== 'loggedIn') return null

  async function logOut(): Promise<void> {
    if (auth.status !== 'loggedIn') return
    await auth.logOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col">
      <MobileHeader />
      <div className="grid flex-1 content-start gap-6 px-4 py-6 md:px-6">
        <div className="flex items-center gap-4">
          <OwnerStamp initials={initialsFromDisplayName(auth.user.displayName)} isCurrentUser size="lg" />
          <h1 className="type-display-m md:type-display">{auth.user.displayName}</h1>
        </div>
        <div className="max-w-105">
          <RowLinkList items={[{ label: 'Log out', onClick: () => void logOut() }]} />
        </div>
      </div>
      <BottomBar className="sticky bottom-0" />
    </div>
  )
}
