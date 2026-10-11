import type { FilterDefinition } from '../api/FilterDefinition'

// filterValueParameters returns the URL parameters that hold a filter's values. A tags filter's second parameter
// (tagMatch) only says how its tags match, so it never counts as an active filter and never gets a chip.
export function filterValueParameters(definition: FilterDefinition): string[] {
  return definition.control === 'tags' ? definition.parameters.slice(0, 1) : definition.parameters
}
