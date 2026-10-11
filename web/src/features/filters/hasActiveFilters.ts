import type { FilterDefinition } from './FilterDefinition'
import { filterValueParameters } from './filterValueParameters'

// hasActiveFilters reports whether query sets any filter value. Empty values ("?size=") do not count.
export function hasActiveFilters(query: URLSearchParams, definitions: FilterDefinition[]): boolean {
  return definitions.some((definition) => filterValueParameters(definition).some((parameter) => query.getAll(parameter).some(Boolean)))
}
