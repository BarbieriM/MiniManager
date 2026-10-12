import { ApiProblem } from '../api/ApiProblem'

// problemMessage is what to tell the User about a failed request: the API's own detail when it answered, or
// fallback when it could not be reached.
export function problemMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  return error instanceof ApiProblem ? error.detail : fallback
}
