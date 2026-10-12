import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'

type DataTableProps = {
  // label names the table for screen readers, e.g. "Users".
  label: string
  // gridTemplateColumns is the CSS grid template, set once per table, e.g. "minmax(150px,1fr) 80px 90px 150px".
  gridTemplateColumns: string
  headers: { label: string; align?: 'end' }[]
  children: ReactNode
}

// DataTable is a plain ruled table for admin lists (Members, Invites): a sunken header row and 56 px rows.
// Each row is a DataRow; the column template travels to the rows as the --cols CSS variable.
export function DataTable({ label, gridTemplateColumns, headers, children }: DataTableProps): ReactElement {
  return (
    <div role="table" aria-label={label} className="border-t border-rule-strong" style={{ '--cols': gridTemplateColumns } as CSSProperties}>
      <div role="row" className="type-label grid min-h-11 grid-cols-(--cols) items-center gap-3 border-b border-rule-strong bg-sunken px-2 text-ink-2">
        {headers.map((header, columnIndex) => (
          <span key={columnIndex} role="columnheader" className={mergeClassNames(header.align === 'end' && 'text-right')}>
            {header.label}
          </span>
        ))}
      </div>
      {children}
    </div>
  )
}
