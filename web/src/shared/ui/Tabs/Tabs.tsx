import type { ReactElement } from 'react'
import { NavLink } from 'react-router'
import { mergeClassNames } from '../../lib/mergeClassNames'

type TabsProps = {
  label: string
  items: { to: string; label: string }[]
}

// Tabs switch between sibling pages (Profile / Password). The current tab has an ink underline, never colour.
export function Tabs({ label, items }: TabsProps): ReactElement {
  return (
    <nav aria-label={label} className="mb-4 flex gap-6 border-b border-rule">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) =>
            mergeClassNames('-mb-px flex min-h-11 min-w-11 items-center justify-center border-b-2', isActive ? 'border-ink text-ink' : 'border-transparent text-ink-2 hover:text-ink')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
