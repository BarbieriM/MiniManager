import type { RouteObject } from 'react-router'
import { Navigate } from 'react-router'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RequireAuth } from '../features/auth/components/RequireAuth'
import { CatalogPage } from '../features/miniatures/pages/CatalogPage'
import { MiniatureDetailsPage } from '../features/miniatures/pages/MiniatureDetailsPage'
import { MiniatureFormPage } from '../features/miniatures/pages/MiniatureFormPage'
import { ProfilePage } from '../features/profile/pages/ProfilePage'
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
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <CatalogPage /> },
              { path: '/minis/new', element: <MiniatureFormPage /> },
              { path: '/minis/:id', element: <MiniatureDetailsPage /> },
              { path: '/minis/:id/edit', element: <MiniatureFormPage /> },
              { path: '/profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
      // Screens from later build steps (members, the rest of profile) do not exist yet.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
