import type { RouteObject } from 'react-router'
import { Navigate } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { CatalogPage } from '../features/miniatures/CatalogPage'
import { AppRoot } from './AppRoot'
import { AppShell } from './AppShell'

// routes is the app's route tree, shared by the browser router and the tests' memory router.
export const routes: RouteObject[] = [
  {
    element: <AppRoot />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [{ element: <AppShell />, children: [{ index: true, element: <CatalogPage /> }] }],
      },
      // Screens from later build steps (profile, members, miniatures) do not exist yet.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
