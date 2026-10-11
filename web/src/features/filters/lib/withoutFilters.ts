import type { FilterDefinition } from '../api/FilterDefinition'

// withoutFilters returns a copy of query with the parameters of definitions and the page removed; the sort stays.
export function withoutFilters(query: URLSearchParams, definitions: FilterDefinition[]): URLSearchParams {
  const next = new URLSearchParams(query)
  for (const definition of definitions) for (const parameter of definition.parameters) next.delete(parameter)
  next.delete('page')
  return next
}
