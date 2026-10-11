import { ApiProblem } from './ApiProblem'
import type { FieldProblem } from './FieldProblem'
import { serverWakeTracker } from './serverWakeTracker'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  // accessToken is sent as a Bearer token; auth endpoints that use only the refresh cookie leave it out.
  accessToken?: string
}

type ProblemBody = { detail?: string; errors?: FieldProblem[] }

const unexpectedProblem = 'Something went wrong. Try again.'

// requestJson calls the API under /api/v1 and returns the parsed JSON body, or undefined for 204.
// A failed response throws an ApiProblem built from the problem+json body.
export async function requestJson<Result>(path: string, { method = 'GET', body, accessToken }: RequestOptions = {}): Promise<Result> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const response = await serverWakeTracker.track(
    fetch(`/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    }),
  )

  if (!response.ok) {
    const problem = await readProblem(response)
    throw new ApiProblem(response.status, problem.detail ?? unexpectedProblem, problem.errors)
  }
  if (response.status === 204) return undefined as Result
  return (await response.json()) as Result
}

async function readProblem(response: Response): Promise<ProblemBody> {
  try {
    return (await response.json()) as ProblemBody
  } catch {
    return {}
  }
}
