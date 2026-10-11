import { render, type RenderResult } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/routes'

type RenderedApp = RenderResult & { router: ReturnType<typeof createMemoryRouter> }

// renderAppAt renders the whole app, with its real routes, as if the browser had opened path. The router is returned
// so a test can press Back with router.navigate(-1).
export function renderAppAt(path: string): RenderedApp {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return { ...render(<RouterProvider router={router} />), router }
}
