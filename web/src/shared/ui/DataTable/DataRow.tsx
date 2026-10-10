import type { ReactElement, ReactNode } from 'react'

// DataRow is one row of a DataTable; each child is one cell.
export function DataRow({ children }: { children: ReactNode }): ReactElement {
  return (
    <div role="row" className="grid min-h-14 grid-cols-(--cols) items-center gap-3 border-b border-rule px-2">
      {children}
    </div>
  )
}
