// jsonResponse builds a fetch Response with a JSON body, as the API sends it.
export function jsonResponse(status: number, body: unknown): Response {
  const isProblem = status >= 400
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': isProblem ? 'application/problem+json' : 'application/json' },
  })
}
