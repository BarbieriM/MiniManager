import type { ReactElement, ReactNode } from 'react'

// NotePanel is a quiet explanation with no status, e.g. why there are no edit buttons.
export function NotePanel({ children }: { children: ReactNode }): ReactElement {
  return <p className="type-dense border border-rule bg-sunken px-4 py-3">{children}</p>
}
