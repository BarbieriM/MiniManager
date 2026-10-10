// OptionCount is the number of minis with an option's value, in mono at the end of the row.
import type { ReactElement } from 'react'
export function OptionCount({ count }: { count?: number }): ReactElement | null {
  if (count === undefined) return null
  return <span className="type-mono ml-auto text-ink-2">{count}</span>
}
