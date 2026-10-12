import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiProblem } from '../api/ApiProblem'

// showFieldProblems puts the API's field errors (a 400 problem) under the form's matching fields, and reports
// whether it found any. Problems for fields the form does not have are left for the caller to show.
export function showFieldProblems<Values extends FieldValues>(error: unknown, setError: UseFormSetError<Values>, fields: readonly Path<Values>[]): boolean {
  if (!(error instanceof ApiProblem)) return false
  const shown = error.fieldProblems.filter((problem) => fields.includes(problem.field as Path<Values>))
  for (const problem of shown) setError(problem.field as Path<Values>, { message: problem.message })
  return shown.length > 0
}
