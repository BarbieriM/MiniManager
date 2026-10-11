import type { ReactElement } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/useAuth'
import { initialsFromDisplayName } from '../shared/lib/initialsFromDisplayName'
import { AppBar } from '../shared/ui'

// AppShell frames every logged-in screen with the desktop app bar. The phone header and bottom bar belong to each
// screen, because whether they show depends on the screen (forms hide the bottom bar; details hide it for those who
// can change the miniature).
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
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
