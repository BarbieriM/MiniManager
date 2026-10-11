import type { FieldProblem } from './FieldProblem'

// ApiProblem is a failed API response. detail is safe to show to the User.
export class ApiProblem extends Error {
  readonly status: number
  readonly detail: string
  readonly fieldProblems: FieldProblem[]

  constructor(status: number, detail: string, fieldProblems: FieldProblem[] = []) {
    super(detail)
    this.name = 'ApiProblem'
    this.status = status
    this.detail = detail
    this.fieldProblems = fieldProblems
  }
}
