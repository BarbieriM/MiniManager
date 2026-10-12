import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../../test/jsonResponse'
import { renderAppAt } from '../../../test/renderAppAt'
import { sessionFor } from '../../../test/sessionFor'
import { stubFetch } from '../../../test/stubFetch'

const loggedOut = (): Response => jsonResponse(401, { detail: 'Your session has ended. Log in again.' })
const noLongerValid = 'This invite is no longer valid. Ask the admin for a new one.'

describe('AcceptInvitePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 1 acceptance criterion 3: shows the invite email, signs up and lands on the Catalog', async () => {
    const signUps: unknown[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': loggedOut,
      'GET /api/v1/invites/abc123': () => jsonResponse(200, { email: 'ana@example.com' }),
      'POST /api/v1/invites/abc123/accept': async (request) => {
        signUps.push(await request.json())
        return jsonResponse(200, sessionFor('Ana'))
      },
      'GET /api/v1/filters': () => jsonResponse(200, []),
      'GET /api/v1/miniatures': () => jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 24, catalogTotal: 0 }),
    })
    renderAppAt('/invite/abc123')

    // Card 1 rule 5: the email comes from the invite and cannot be changed.
    expect(await screen.findByLabelText('Email')).toHaveValue('ana@example.com')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
    await userEvent.type(screen.getByLabelText('Your name'), 'Ana')
    await userEvent.type(screen.getByLabelText('Password'), 'a good password')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Catalog' })).toBeInTheDocument()
    expect(signUps).toEqual([{ displayName: 'Ana', password: 'a good password' }])
  })

  it('card 1 acceptance criterion 2: an expired, used or cancelled invite shows the no longer valid message', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': loggedOut,
      'GET /api/v1/invites/old': () => jsonResponse(410, { detail: noLongerValid }),
    })
    renderAppAt('/invite/old')

    expect(await screen.findByText(noLongerValid)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument()
  })

  it('card 3 rule 5: a name already in use shows under the name field', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': loggedOut,
      'GET /api/v1/invites/abc123': () => jsonResponse(200, { email: 'ana@example.com' }),
      'POST /api/v1/invites/abc123/accept': () =>
        jsonResponse(400, { detail: 'Some fields are invalid.', errors: [{ field: 'displayName', message: 'Someone in the group already uses this name.' }] }),
    })
    renderAppAt('/invite/abc123')

    await userEvent.type(await screen.findByLabelText('Your name'), 'Mateus')
    await userEvent.type(screen.getByLabelText('Password'), 'a good password')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Someone in the group already uses this name.')).toBeInTheDocument()
  })

  it('asks a logged-in User to log out before accepting', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Mateus', { role: 'admin' })),
      'POST /api/v1/auth/logout': () => new Response(null, { status: 204 }),
      'GET /api/v1/invites/abc123': () => jsonResponse(200, { email: 'ana@example.com' }),
    })
    renderAppAt('/invite/abc123')

    expect(await screen.findByText("You're logged in as Mateus. Log out to accept this invite.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByLabelText('Email')).toHaveValue('ana@example.com')
  })
})
