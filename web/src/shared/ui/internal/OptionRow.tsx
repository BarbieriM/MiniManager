import type { ReactElement, ReactNode } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'

type OptionRowProps = {
  id: string
  isActive: boolean
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
  children: ReactNode
}

// OptionRow is one 44 px row in a Popover. Mouse-down is cancelled so the input keeps focus.
export function OptionRow({ id, isActive, isSelected, onSelect, onHover, children }: OptionRowProps): ReactElement {
  return (
    <li
      id={id}
      role="option"
      aria-selected={isSelected}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      onMouseMove={onHover}
      className={mergeClassNames(
        'flex min-h-11 cursor-pointer items-center gap-3 border-b border-rule px-3 last:border-b-0',
        isActive && 'bg-sunken',
      )}
    >
      {children}
    </li>
  )
}
