import { useState, type ReactElement } from 'react'
import { Button, Sheet } from '../../../shared/ui'
import type { FilterDefinition } from '../api/FilterDefinition'
import { FilterControls } from './FilterControls'
import { useMatchingCount } from '../api/useMatchingCount'
import { withoutFilters } from '../lib/withoutFilters'

type FilterSheetProps = {
  open: boolean
  onClose: () => void
  definitions: FilterDefinition[]
  // query is the URL's current state; the sheet edits a pending copy of it.
  query: URLSearchParams
  onApply: (query: URLSearchParams) => void
}

// FilterSheet is the phone filter panel (Card 6 edge case): the same controls as the desktop rail, on a pending copy
// of the filters. Its footer counts the pending filters live, and nothing changes until "Show N minis" is tapped.
export function FilterSheet(props: FilterSheetProps): ReactElement | null {
  // Mounting only while open starts every visit from the URL's current filters.
  return props.open ? <PendingFilterSheet {...props} /> : null
}

function PendingFilterSheet({ onClose, definitions, query, onApply }: FilterSheetProps): ReactElement {
  const [pending, setPending] = useState(() => new URLSearchParams(query))
  const matchingCount = useMatchingCount(pending)
  const showLabel = matchingCount === undefined ? 'Show results' : `Show ${matchingCount} ${matchingCount === 1 ? 'mini' : 'minis'}`
  // The search sits above the results, not in the sheet, so the sheet's "Clear all" leaves it alone.
  const sheetDefinitions = definitions.filter((definition) => definition.control !== 'search')

  return (
    <Sheet
      open
      onClose={onClose}
      title="Filters"
      headerActions={
        <Button variant="quiet" size="sm" onClick={() => setPending(withoutFilters(pending, sheetDefinitions))}>
          Clear all
        </Button>
      }
      footer={
        <Button variant="primary" fullWidth onClick={() => onApply(pending)}>
          {showLabel}
        </Button>
      }
    >
      <FilterControls definitions={sheetDefinitions} query={pending} onChange={setPending} />
    </Sheet>
  )
}
