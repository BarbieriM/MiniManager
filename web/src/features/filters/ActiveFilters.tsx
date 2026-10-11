import type { ReactElement } from 'react'
import { formatChallengeRating } from '../../shared/lib/formatChallengeRating'
import { Button, FilterChip, FilterChipRow } from '../../shared/ui'
import type { FilterDefinition } from './FilterDefinition'
import { filterValueParameters } from './filterValueParameters'
import { withoutFilters } from './withoutFilters'
import { withParameterValues } from './withParameterValues'

type ActiveFiltersProps = {
  definitions: FilterDefinition[]
  query: URLSearchParams
  onChange: (query: URLSearchParams) => void
}

type ActiveChip = { key: string; filterName: string; filterValue: string; remove: () => URLSearchParams }

// The chip names of a Challenge Rating range's two parameters, in order.
const challengeRatingBoundNames = ['Minimum CR', 'Maximum CR']

// activeChips lists one chip per active value, named by the option's label (an Owner's name, not their id).
function activeChips(definitions: FilterDefinition[], query: URLSearchParams): ActiveChip[] {
  const chips: ActiveChip[] = []
  for (const definition of definitions) {
    filterValueParameters(definition).forEach((parameter, index) => {
      const values = query.getAll(parameter).filter(Boolean)
      for (const value of values) {
        const isBound = definition.control === 'challengeRatingRange'
        chips.push({
          key: `${parameter}=${value}`,
          filterName: isBound ? challengeRatingBoundNames[index] : definition.label,
          filterValue: isBound ? formatChallengeRating(Number(value)) : (definition.options?.find((option) => option.value === value)?.label ?? value),
          remove: () => withParameterValues(query, parameter, values.filter((other) => other !== value)),
        })
      }
    })
  }
  return chips
}

// ActiveFilters shows the active filters as removable chips above the results, with "Clear all" (docs/context.md).
export function ActiveFilters({ definitions, query, onChange }: ActiveFiltersProps): ReactElement | null {
  const chips = activeChips(definitions, query)
  if (chips.length === 0) return null
  return (
    <FilterChipRow>
      {chips.map((chip) => (
        <FilterChip key={chip.key} filterName={chip.filterName} filterValue={chip.filterValue} onRemove={() => onChange(chip.remove())} />
      ))}
      <Button variant="quiet" size="sm" onClick={() => onChange(withoutFilters(query, definitions))}>
        Clear all
      </Button>
    </FilterChipRow>
  )
}
