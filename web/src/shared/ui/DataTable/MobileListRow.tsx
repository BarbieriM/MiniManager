import type { ReactElement, ReactNode } from 'react'
import { Person, type PersonProps } from './Person'

type MobileListRowProps = PersonProps & {
  // metaText sits on the right of the name line, e.g. the role.
  metaText?: ReactNode
  // actions are full-width buttons under the person.
  actions?: ReactNode
}

// MobileListRow is the phone version of a DataRow: the person on top, full-width actions below.
export function MobileListRow({ metaText, actions, ...person }: MobileListRowProps): ReactElement {
  return (
    <div className="grid gap-2 border-b border-rule px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <Person {...person} />
        </span>
        {metaText && <span className="type-dense text-ink-2">{metaText}</span>}
      </div>
      {actions && <div className="flex gap-2 *:flex-1">{actions}</div>}
    </div>
  )
}
