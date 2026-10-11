import { vi, type Mock } from 'vitest'

// FetchRoute answers one "METHOD /path" key. Return a Response, or a promise that never settles to simulate a
// sleeping server.
export type FetchRoute = (request: Request) => Response | Promise<Response>

// stubFetch replaces the global fetch with routes keyed by "METHOD /path". Unknown keys fail the test loudly.
export function stubFetch(routes: Record<string, FetchRoute>): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const request = new Request(new URL(String(input instanceof Request ? input.url : input), 'http://localhost'), init)
    const key = `${request.method} ${new URL(request.url).pathname}`
    const route = routes[key]
    if (!route) throw new Error(`stubFetch: no route for ${key}`)
    return route(request)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
