import { useId, type ReactElement, type ReactNode } from 'react'

type TooltipProps = {
  label: string
  children: ReactNode
}

// Tooltip shows its label on hover and on keyboard focus, and names the trigger for screen readers.
export function Tooltip({ label, children }: TooltipProps): ReactElement {
  const id = useId()
  return (
    <span className="group relative inline-flex">
      <span tabIndex={0} aria-describedby={id} className="inline-flex items-center">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className="type-dense pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap border border-rule-strong bg-raised px-2 text-ink group-hover:visible group-focus-within:visible"
      >
        {label}
      </span>
    </span>
  )
}
