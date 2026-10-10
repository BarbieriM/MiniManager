import { render, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'

// renderAtPath renders an element as if the browser were on path, for components that use router links.
export function renderAtPath(path: string, element: ReactNode): RenderResult {
  return render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>)
}
