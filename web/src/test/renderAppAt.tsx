import { render, type RenderResult } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/routes'

// renderAppAt renders the whole app, with its real routes, as if the browser had opened path.
export function renderAppAt(path: string): RenderResult {
  return render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}
