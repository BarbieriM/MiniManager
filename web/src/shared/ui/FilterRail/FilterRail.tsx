import type { ReactElement, ReactNode } from 'react'

type FilterRailProps = {
  children: ReactNode
}

// FilterRail is the desktop filter column (280 px) beside the results; phones get the same filters in a Sheet.
export function FilterRail({ children }: FilterRailProps): ReactElement {
  return (
    <aside aria-label="Filters" className="hidden w-70 shrink-0 border-r border-rule-strong px-6 pt-4 pb-8 md:block">
      {children}
    </aside>
  )
}
