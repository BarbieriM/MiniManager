import type { FilterDefinition } from './FilterDefinition'
import { filterValueParameters } from './filterValueParameters'

// countActiveFilters counts the active filter values (each ticked size, each tag, each CR bound) for the phone
// Filters button. The search sits beside that button, so it is not counted.
export function countActiveFilters(query: URLSearchParams, definitions: FilterDefinition[]): number {
  return definitions
    .filter((definition) => definition.control !== 'search')
    .flatMap(filterValueParameters)
    .reduce((count, parameter) => count + query.getAll(parameter).filter(Boolean).length, 0)
}
