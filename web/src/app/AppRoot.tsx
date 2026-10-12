import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactElement } from 'react'
import { Outlet } from 'react-router'
import { AuthProvider } from '../features/auth/components/AuthProvider'
import { ApiProblem } from '../shared/api/ApiProblem'
import { useIsServerWaking } from '../shared/api/useIsServerWaking'
import { Banner, ToastProvider } from '../shared/ui'

// AppRoot wraps every route: the query cache, the Session, toasts, and the waking-server banner for Render's cold
// starts.
export function AppRoot(): ReactElement {
  const isServerWaking = useIsServerWaking()
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: retryUnlessTheApiAnswered } } }))
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          {isServerWaking && (
            <Banner icon="clock" showProgress>
              Waking the server. This can take up to a minute.
            </Banner>
          )}
          <Outlet />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// retryUnlessTheApiAnswered retries network failures twice, but never an answer such as 404 or 403: asking again
// would get the same answer.
function retryUnlessTheApiAnswered(failureCount: number, error: Error): boolean {
  return !(error instanceof ApiProblem) && failureCount < 2
}
