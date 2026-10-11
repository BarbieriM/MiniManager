import type { ReactElement } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/useAuth'
import { initialsFromDisplayName } from '../shared/lib/initialsFromDisplayName'
import { AppBar, Button, MobileHeader } from '../shared/ui'

// AppShell frames every logged-in screen: the desktop app bar, the phone header and the page.
// Until Profile exists (Card 3), Log out on phones sits in the header instead of the Profile list.
export function AppShell(): ReactElement | null {
  const auth = useAuth()
  const navigate = useNavigate()
  if (auth.status !== 'loggedIn') return null

  async function logOut(): Promise<void> {
    if (auth.status !== 'loggedIn') return
    await auth.logOut()
    navigate('/login', { replace: true })
  }

  const user = { displayName: auth.user.displayName, initials: initialsFromDisplayName(auth.user.displayName) }
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Members arrives with roles and invites in build step 4, so the link stays hidden until then. */}
      <AppBar user={user} isAdmin={false} onLogout={() => void logOut()} />
      <MobileHeader
        action={
          <Button variant="quiet" onClick={() => void logOut()}>
            Log out
          </Button>
        }
      />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
