import type { RouteObject } from 'react-router'
import { Navigate } from 'react-router'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage'
import { RequireAuth } from '../features/auth/components/RequireAuth'
import { AcceptInvitePage } from '../features/invites/pages/AcceptInvitePage'
import { MembersPage } from '../features/members/pages/MembersPage'
import { CatalogPage } from '../features/miniatures/pages/CatalogPage'
import { MiniatureDetailsPage } from '../features/miniatures/pages/MiniatureDetailsPage'
import { MiniatureFormPage } from '../features/miniatures/pages/MiniatureFormPage'
import { ChangePasswordPage } from '../features/profile/pages/ChangePasswordPage'
import { ProfilePage } from '../features/profile/pages/ProfilePage'
import { AppRoot } from './AppRoot'
import { AppShell } from './AppShell'

// routes is the app's route tree, shared by the browser router and the tests' memory router.
export const routes: RouteObject[] = [
  {
    element: <AppRoot />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/invite/:token', element: <AcceptInvitePage /> },
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
              { path: '/profile/password', element: <ChangePasswordPage /> },
              { path: '/admin/members', element: <MembersPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
