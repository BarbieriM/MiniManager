// withParameterValues returns a copy of query with parameter set to values (removed when empty). Any change to the
// filters goes back to page 1, so page is dropped too.
export function withParameterValues(query: URLSearchParams, parameter: string, values: string[]): URLSearchParams {
  const next = new URLSearchParams(query)
  next.delete(parameter)
  next.delete('page')
  for (const value of values) next.append(parameter, value)
  return next
}
