import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../../test/jsonResponse'
import { renderAppAt } from '../../../test/renderAppAt'
import { stubFetch } from '../../../test/stubFetch'

const loggedOut = (): Response => jsonResponse(401, { detail: 'Your session has ended. Log in again.' })

describe('ResetPasswordPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 2: sets a new password and lands on the login page with "Password updated"', async () => {
    const confirmed: unknown[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': loggedOut,
      'POST /api/v1/auth/password-reset/confirm': async (request) => {
        confirmed.push(await request.json())
        return new Response(null, { status: 204 })
      },
    })
    renderAppAt('/reset-password?token=abc123')

    await userEvent.type(await screen.findByLabelText('New password'), 'a brand new password')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByText(/Password updated/)).toBeInTheDocument()
    expect(confirmed).toEqual([{ token: 'abc123', password: 'a brand new password' }])
  })

  it('card 2 acceptance criterion 4: a used link shows the invalid link message and offers a new one', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': loggedOut,
      'POST /api/v1/auth/password-reset/confirm': () => jsonResponse(410, { detail: 'This reset link is invalid or expired.' }),
    })
    renderAppAt('/reset-password?token=used')

    await userEvent.type(await screen.findByLabelText('New password'), 'a brand new password')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByText('This reset link is invalid or expired.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ask for a new link' })).toHaveAttribute('href', '/forgot-password')
  })

  it('checks the password length before sending', async () => {
    const fetchMock = stubFetch({ 'POST /api/v1/auth/refresh': loggedOut })
    renderAppAt('/reset-password?token=abc123')

    await userEvent.type(await screen.findByLabelText('New password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByText('Password must be 8 to 72 characters.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('password-reset'))).toBe(false)
  })
})
