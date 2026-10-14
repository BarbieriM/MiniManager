import type { ReactElement, ReactNode } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'

type StickyActionBarProps = {
  children: ReactNode
  // twoColumns lays two buttons side by side (Edit + Delete on details).
  twoColumns?: boolean
  className?: string
}

// StickyActionBar pins a screen's actions to the bottom of a phone screen, in thumb reach,
// with an ink rule above (Save on forms; Edit and Delete on details for owners and admins).
export function StickyActionBar({ children, twoColumns = false, className }: StickyActionBarProps): ReactElement {
  return <div className={mergeClassNames('sticky bottom-0 grid shrink-0 gap-2 border-t border-rule-strong bg-page px-4 py-3 md:hidden', twoColumns && 'grid-cols-2', className)}>{children}</div>
}
