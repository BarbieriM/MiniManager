import type { ReactElement, ReactNode } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'

// DataCell is one cell of a DataRow; align end right-aligns numbers and actions.
export function DataCell({ children, align }: { children?: ReactNode; align?: 'end' }): ReactElement {
  return (
    <div role="cell" className={mergeClassNames('min-w-0', align === 'end' && 'flex justify-end gap-2 text-right')}>
      {children}
    </div>
  )
}
