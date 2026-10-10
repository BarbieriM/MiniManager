import type { ReactElement } from 'react'
import { Icon } from '../Icon/Icon'

type FilterChipProps = {
  // filterName is the filter ("Size"), filterValue the active choice ("Small").
  filterName: string
  filterValue: string
  onRemove: () => void
}

// FilterChip shows one active filter above the results; the whole chip removes it.
// Hover turns it vermilion to show that clicking removes it.
export function FilterChip({ filterName, filterValue, onRemove }: FilterChipProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter ${filterName}: ${filterValue}`}
      className="group type-dense inline-flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-ds border border-rule-strong pl-3 text-ink hover:border-accent hover:text-accent md:h-8 md:pr-1"
    >
      <span className="type-label text-ink-2 group-hover:text-accent">{filterName}</span>
      {filterValue}
      <span className="grid size-11 place-items-center md:size-6">
        <Icon name="close" size={16} />
      </span>
    </button>
  )
}
