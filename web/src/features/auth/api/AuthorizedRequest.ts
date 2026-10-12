// AuthorizedRequest calls the API as the logged-in User: path is under /api/v1, the access token is attached, and
// an expired token is refreshed once before the request is retried.
export type AuthorizedRequest = <Result>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown },
) => Promise<Result>
