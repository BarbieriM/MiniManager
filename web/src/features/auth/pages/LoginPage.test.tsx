import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../../app/routes'
import { jsonResponse } from '../../../test/jsonResponse'
import { stubFetch, type FetchRoute } from '../../../test/stubFetch'

const loggedOut: FetchRoute = () => jsonResponse(401, { status: 401, detail: 'Your session has ended. Log in again.' })

async function renderLoginWith(login: FetchRoute): Promise<void> {
  stubFetch({ 'POST /api/v1/auth/refresh': loggedOut, 'POST /api/v1/auth/login': login })
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/login'] })} />)
  await screen.findByRole('heading', { name: 'Log in' })
}

async function submit(email: string, password: string): Promise<void> {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 2 rule 2: shows the one wrong-credentials message, keeps the email and clears the password', async () => {
    await renderLoginWith(() => jsonResponse(401, { status: 401, detail: 'Email or password is incorrect.' }))

    await submit('mateus@example.com', 'wrong password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(screen.getByLabelText('Email')).toHaveValue('mateus@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('card 2 rule 3: shows the lock message and disables Log in until the email changes', async () => {
    await renderLoginWith(() => jsonResponse(429, { status: 429, detail: 'Too many attempts. Try again in 15 minutes.' }))

    await submit('mateus@example.com', 'correct horse')

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Try again in 15 minutes.')
    expect(screen.getByRole('button', { name: 'Log in' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Email'), 'x')
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled()
  })

  it('shows the loading state while the login request is pending', async () => {
    await renderLoginWith(() => new Promise<Response>(() => {}))

    await submit('mateus@example.com', 'correct horse')

    const button = await screen.findByRole('button', { name: 'Logging in' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByLabelText('Email')).toBeDisabled()
  })

  it('asks for both fields before calling the API', async () => {
    const login = vi.fn<FetchRoute>()
    await renderLoginWith(login)

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Enter your email.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })
})
