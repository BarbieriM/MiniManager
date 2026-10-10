import type { ReactElement, ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  // metaLine is one mono line under the title, e.g. "6 people · 1 admin".
  metaLine?: ReactNode
  // action is the page's single primary action.
  action?: ReactNode
}

// PageHeader holds the page title, one meta line and the primary action.
export function PageHeader({ title, metaLine, action }: PageHeaderProps): ReactElement {
  return (
    <div className="mb-4 flex items-end justify-between gap-6">
      <div>
        <h1 className="type-display-m md:type-display">{title}</h1>
        {metaLine && <p className="type-mono mt-1 text-ink-2">{metaLine}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
