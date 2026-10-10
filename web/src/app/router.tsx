import { createBrowserRouter, type RouteObject } from 'react-router'
import { App } from './App'

const routes: RouteObject[] = [{ path: '/', element: <App /> }]

// The component gallery exists only in development; import.meta.env.DEV is false in production builds,
// so the bundler drops this branch and the page's code.
if (import.meta.env.DEV) {
  routes.push({
    path: '/dev/ui/*',
    // Nothing to show while the page's code loads; it is local and takes milliseconds.
    HydrateFallback: () => null,
    lazy: async () => ({ Component: (await import('./dev/DevUiPage')).DevUiPage }),
  })
}

export const router = createBrowserRouter(routes)
