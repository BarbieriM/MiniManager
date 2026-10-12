import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../../test/jsonResponse'
import { renderAppAt } from '../../../test/renderAppAt'
import { stubFetch } from '../../../test/stubFetch'

const loggedOut = (): Response => jsonResponse(401, { detail: 'Your session has ended. Log in again.' })

describe('ForgotPasswordPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 2 rule 7: a reset request always gives the same answer', async () => {
    const requested: unknown[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': loggedOut,
      'POST /api/v1/auth/password-reset': async (request) => {
        requested.push(await request.json())
        return jsonResponse(202, { message: 'If that email exists, we sent a link.' })
      },
    })
    renderAppAt('/login')

    await userEvent.click(await screen.findByRole('link', { name: 'Forgot password?' }))
    await userEvent.type(await screen.findByLabelText('Email'), 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText(/If that email exists, we sent a link\./)).toBeInTheDocument()
    expect(requested).toEqual([{ email: 'ana@example.com' }])
  })
})
