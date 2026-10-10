import { useId, useRef, useState, type ReactElement } from 'react'
import { Link, NavLink } from 'react-router'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon } from '../Icon/Icon'
import { useCloseOnOutsideClick } from '../internal/useCloseOnOutsideClick'
import { OwnerStamp } from '../OwnerStamp/OwnerStamp'
import { Wordmark } from '../Wordmark/Wordmark'

type AppBarProps = {
  user: { displayName: string; initials: string }
  // isAdmin shows the Members link. Hiding it is convenience only; the API enforces roles (Card 4).
  isAdmin: boolean
  onLogout: () => void
}

const navLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  mergeClassNames('-mb-px flex items-center border-b-2 pt-0.5', isActive ? 'border-ink text-ink' : 'border-transparent text-ink-2 hover:text-ink')

const menuItemClassName = 'flex min-h-11 w-full cursor-pointer items-center border-b border-rule px-3 text-left text-ink last:border-b-0 hover:bg-sunken'

// AppBar is the desktop top bar: wordmark, Catalog, Members (admins), and the profile menu.
// The menu is a disclosure (a button that shows a list of links), closed by Esc or a click outside.
export function AppBar({ user, isAdmin, onLogout }: AppBarProps): ReactElement {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const menuContainerRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  useCloseOnOutsideClick(menuContainerRef, open, () => setOpen(false))

  function closeMenu(): void {
    setOpen(false)
    menuButtonRef.current?.focus()
  }

  return (
    <header className="hidden h-14 items-stretch gap-8 border-b border-rule-strong bg-page px-6 md:flex">
      <Link to="/" className="self-center" aria-label="Mini Manager, catalog">
        <Wordmark />
      </Link>
      <nav aria-label="Main" className="flex gap-6">
        <NavLink to="/" end className={navLinkClassName}>
          Catalog
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/members" className={navLinkClassName}>
            Members
          </NavLink>
        )}
      </nav>
      <div
        ref={menuContainerRef}
        className="relative ml-auto self-center"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) closeMenu()
        }}
      >
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen(!open)}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-ds px-2 hover:bg-sunken"
        >
          <OwnerStamp initials={user.initials} isCurrentUser />
          <span className="type-dense">{user.displayName}</span>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} />
        </button>
        {open && (
          <div id={menuId} className="absolute top-full right-0 z-20 mt-1 w-50 border border-rule-strong bg-raised">
            <Link to="/profile" className={menuItemClassName} onClick={() => setOpen(false)}>
              Profile
            </Link>
            <Link to="/profile/password" className={menuItemClassName} onClick={() => setOpen(false)}>
              Change password
            </Link>
            <button
              type="button"
              className={menuItemClassName}
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
