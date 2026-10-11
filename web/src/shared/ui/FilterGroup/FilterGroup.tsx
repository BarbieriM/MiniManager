import { useId, useState, type ReactElement, type ReactNode } from 'react'
import { Icon } from '../Icon/Icon'

type FilterGroupProps = {
  label: string
  children: ReactNode
  defaultOpen?: boolean
}

// FilterGroup is one filter in the rail or the phone sheet: a ruled heading whose chevron opens and closes the
// controls below it. Closed controls stay mounted, so a half-made choice survives collapsing.
export function FilterGroup({ label, children, defaultOpen = true }: FilterGroupProps): ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const bodyId = useId()
  return (
    <section className="border-t border-rule">
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={() => setIsOpen(!isOpen)}
          className="type-label flex min-h-11 w-full cursor-pointer items-center justify-between text-left"
        >
          {label}
          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} />
        </button>
      </h3>
      <div id={bodyId} hidden={!isOpen} className="grid gap-3 pb-3">
        {children}
      </div>
    </section>
  )
}
