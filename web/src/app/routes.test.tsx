import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/jsonResponse'
import { stubFetch } from '../test/stubFetch'
import { routes } from './routes'

const sessionExpired = { type: 'about:blank', title: 'Unauthorized', status: 401, detail: 'Your session has ended. Log in again.' }

const mateusSession = {
  accessToken: 'access-token',
  expiresIn: 900,
  user: { id: '0199a8f2-0000-7000-8000-000000000001', displayName: 'Mateus Barbieri', role: 'admin' },
}

function renderAppAt(path: string): void {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

describe('app routes', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends a logged-out visit to the catalog to the login screen', async () => {
    stubFetch({ 'POST /api/v1/auth/refresh': () => jsonResponse(401, sessionExpired) })

    renderAppAt('/')

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('card 2 acceptance criterion 1: a reload with a valid refresh cookie lands on the catalog, still logged in', async () => {
    stubFetch({ 'POST /api/v1/auth/refresh': () => jsonResponse(200, mateusSession) })

    renderAppAt('/')

    expect(await screen.findByRole('heading', { name: 'Catalog' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mateus Barbieri/ })).toBeInTheDocument()
  })

  it('retries a refresh refused with 401 once, for two tabs refreshing at the same moment', async () => {
    let attempts = 0
    const fetchMock = stubFetch({
      'POST /api/v1/auth/refresh': () => {
        attempts += 1
        return attempts === 1 ? jsonResponse(401, sessionExpired) : jsonResponse(200, mateusSession)
      },
    })

    renderAppAt('/')

    expect(await screen.findByRole('heading', { name: 'Catalog' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('logs in and lands on the catalog', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(401, sessionExpired),
      'POST /api/v1/auth/login': async (request) => {
        expect(await request.json()).toEqual({ email: 'mateus@example.com', password: 'correct horse' })
        return jsonResponse(200, mateusSession)
      },
    })
    renderAppAt('/')

    await userEvent.type(await screen.findByLabelText('Email'), 'mateus@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('heading', { name: 'Catalog' })).toBeInTheDocument()
  })

  it('card 2 rule 6: logging out revokes the Session and returns to the login screen', async () => {
    const fetchMock = stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, mateusSession),
      'POST /api/v1/auth/logout': () => new Response(null, { status: 204 }),
    })
    renderAppAt('/')

    // jsdom applies no CSS, so the phone header's Log out renders too; use the desktop profile menu's.
    const menuButton = await screen.findByRole('button', { name: /Mateus Barbieri/ })
    await userEvent.click(menuButton)
    const menu = document.getElementById(menuButton.getAttribute('aria-controls') ?? '')
    await userEvent.click(within(menu!).getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', expect.objectContaining({ method: 'POST' }))
  })
})
