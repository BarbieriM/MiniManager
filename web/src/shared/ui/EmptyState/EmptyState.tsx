import type { ReactElement, ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  children: ReactNode
  // action is the one way forward, e.g. "Add your first miniature" or "Clear filters".
  action?: ReactNode
}

// EmptyState: one ink line drawing of a base on the grid, one title, one sentence, one action.
export function EmptyState({ title, children, action }: EmptyStateProps): ReactElement {
  return (
    <div className="grid max-w-105 justify-items-start gap-3 py-8">
      <svg viewBox="0 0 64 64" className="size-16 text-ink" fill="none" stroke="currentColor" strokeWidth="1" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="8.5" y="8.5" width="47" height="47" />
        <path d="M8.5 32H55.5M32 8.5V55.5" strokeDasharray="2 3" />
        <circle cx="32" cy="32" r="9" />
      </svg>
      <h2 className="type-title">{title}</h2>
      <p className="text-ink-2">{children}</p>
      {action}
    </div>
  )
}
