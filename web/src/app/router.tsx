import { createBrowserRouter, type RouteObject } from 'react-router'
import { routes } from './routes'

// The component gallery exists only in development; import.meta.env.DEV is false in production builds,
// so the bundler drops this route and the page's code.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui/*',
        // Nothing to show while the page's code loads; it is local and takes milliseconds.
        HydrateFallback: () => null,
        lazy: async () => ({ Component: (await import('./dev/DevUiPage')).DevUiPage }),
      },
    ]
  : []

export const router = createBrowserRouter([...devRoutes, ...routes])
