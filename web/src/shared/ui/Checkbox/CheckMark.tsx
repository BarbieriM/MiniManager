// CheckMark is the tick drawn inside a checked box.
import type { ReactElement } from 'react'
export function CheckMark(): ReactElement {
  return (
    <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 6.5L5 9.5L10 3" />
    </svg>
  )
}
