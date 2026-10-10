import type { ReactElement, ReactNode } from 'react'

type PopoverProps = {
  id: string
  label?: string
  labelledBy?: string
  multiselectable?: boolean
  children: ReactNode
}

// Popover is the open list under a select, combobox or tag input: raised, 1 px ink border, square corners.
export function Popover({ id, label, labelledBy, multiselectable, children }: PopoverProps): ReactElement {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-multiselectable={multiselectable || undefined}
      className="absolute top-full right-0 left-0 z-20 mt-1 max-h-66 overflow-y-auto border border-rule-strong bg-raised"
    >
      {children}
    </ul>
  )
}
