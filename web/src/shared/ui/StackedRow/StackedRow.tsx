import type { ReactElement, ReactNode } from 'react'

type StackedRowProps = {
  // heading is what the row is about, such as a person or an email.
  heading: ReactNode
  // metaText sits on the right of the heading line, such as a role or a status.
  metaText?: ReactNode
  // actions are full-width buttons under the heading, each at least 44 px tall on phones.
  actions?: ReactNode
}

// StackedRow is a phone list row: the heading and its meta on one line, full-width actions below. It stands in for a
// table row where a table would be wider than the screen.
export function StackedRow({ heading, metaText, actions }: StackedRowProps): ReactElement {
  return (
    <div className="grid gap-2 border-b border-rule px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">{heading}</span>
        {metaText && <span className="type-dense flex shrink-0 items-center gap-2 text-ink-2">{metaText}</span>}
      </div>
      {actions && <div className="flex gap-2 *:flex-1">{actions}</div>}
    </div>
  )
}
