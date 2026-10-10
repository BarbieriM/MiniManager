import type { ReactElement } from 'react'
import { NavLink } from 'react-router'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon } from '../Icon/Icon'

type BottomBarProps = {
  // outlineAddButton draws Add in ink when the screen has its own vermilion primary action.
  outlineAddButton?: boolean
  className?: string
}

const navItemClassName = ({ isActive }: { isActive: boolean }): string =>
  mergeClassNames(
    'type-label relative grid content-center justify-items-center gap-0.5',
    isActive ? 'text-ink before:absolute before:inset-x-4 before:-top-px before:h-0.5 before:bg-ink' : 'text-ink-2',
  )

// BottomBar is the phone navigation: Catalog, Add, Profile. Add is the only vermilion item.
// Screens that pin their own actions (forms, details for owners) hide it.
export function BottomBar({ outlineAddButton = false, className }: BottomBarProps): ReactElement {
  return (
    <nav aria-label="Main" className={mergeClassNames('grid h-16 shrink-0 grid-cols-3 border-t border-rule-strong bg-page md:hidden', className)}>
      <NavLink to="/" end className={navItemClassName}>
        <Icon name="list" />
        Catalog
      </NavLink>
      <NavLink to="/minis/new" aria-label="Add miniature" className="grid place-items-center">
        <span
          className={mergeClassNames(
            'grid h-11 w-14 place-items-center rounded-ds',
            outlineAddButton ? 'border border-rule-strong text-ink' : 'bg-accent text-on-accent',
          )}
        >
          <Icon name="plus" />
        </span>
      </NavLink>
      <NavLink to="/profile" className={navItemClassName}>
        <Icon name="user" />
        Profile
      </NavLink>
    </nav>
  )
}
