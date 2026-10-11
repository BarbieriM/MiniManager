import type { ReactElement, ReactNode } from 'react'

type FilterChipRowProps = {
  children: ReactNode
}

// FilterChipRow lines up the active filters' FilterChips above the results, wrapping onto more lines as needed.
export function FilterChipRow({ children }: FilterChipRowProps): ReactElement {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}
