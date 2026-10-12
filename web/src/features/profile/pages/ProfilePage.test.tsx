import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../../test/jsonResponse'
import { renderAppAt } from '../../../test/renderAppAt'
import { sessionFor } from '../../../test/sessionFor'
import { stubFetch } from '../../../test/stubFetch'

describe('ProfilePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 2 rule 6: shows my name and logs out from the Log out row', async () => {
    const loggedOut: string[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana Souza')),
      'POST /api/v1/auth/logout': () => {
        loggedOut.push('yes')
        return new Response(null, { status: 204 })
      },
    })
    renderAppAt('/profile')

    expect(await screen.findByRole('heading', { name: 'Ana Souza' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(loggedOut).toEqual(['yes'])
  })

  it('card 3 rule 1: changes my name, shows it at once and says the profile was saved', async () => {
    const saved: unknown[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'PATCH /api/v1/me': async (request) => {
        saved.push(await request.json())
        return jsonResponse(200, { id: 'ana-id', email: 'ana@example.com', displayName: 'Ana Souza', role: 'member' })
      },
    })
    renderAppAt('/profile')

    const name = await screen.findByLabelText('Name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Ana Souza')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Profile saved')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ana Souza' })).toBeInTheDocument()
    expect(saved).toEqual([{ displayName: 'Ana Souza' }])
  })

  it('card 3 rule 5: a name someone else uses shows under the field', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'PATCH /api/v1/me': () =>
        jsonResponse(400, { detail: 'Some fields are invalid.', errors: [{ field: 'displayName', message: 'Someone in the group already uses this name.' }] }),
    })
    renderAppAt('/profile')

    const name = await screen.findByLabelText('Name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Mateus')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Someone in the group already uses this name.')).toBeInTheDocument()
  })

  it('card 4 rule 5: only an Admin gets the Members row', async () => {
    stubFetch({ 'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Mateus', { role: 'admin' })) })
    renderAppAt('/profile')

    // The desktop app bar has its own Members link; this is the row on the Profile page itself.
    const page = await screen.findByRole('main')
    expect(await within(page).findByRole('link', { name: 'Members' })).toHaveAttribute('href', '/admin/members')
    expect(within(page).getByRole('link', { name: 'Change password' })).toHaveAttribute('href', '/profile/password')
  })

  it('card 4 rule 5: a Member gets no Members row', async () => {
    stubFetch({ 'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')) })
    renderAppAt('/profile')

    await screen.findByRole('link', { name: 'Change password' })
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument()
  })
})
