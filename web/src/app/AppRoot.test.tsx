import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/jsonResponse'
import { stubFetch } from '../test/stubFetch'
import { routes } from './routes'

const wakingMessage = 'Waking the server. This can take up to a minute.'

describe('AppRoot', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows the waking-server banner while the first request takes over 3 seconds, then hides it', async () => {
    vi.useFakeTimers()
    let wakeUp: (response: Response) => void = () => {}
    stubFetch({ 'POST /api/v1/auth/refresh': () => new Promise<Response>((resolve) => (wakeUp = resolve)) })
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />)

    await act(async () => vi.advanceTimersByTime(2900))
    expect(screen.queryByText(wakingMessage)).not.toBeInTheDocument()

    await act(async () => vi.advanceTimersByTime(200))
    expect(screen.getByRole('status')).toHaveTextContent(wakingMessage)

    const loggedOut = (): Response => jsonResponse(401, { status: 401, detail: 'Your session has ended. Log in again.' })
    await act(async () => wakeUp(loggedOut()))
    await act(async () => wakeUp(loggedOut())) // the one retry after a 401
    expect(screen.queryByText(wakingMessage)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })
})
