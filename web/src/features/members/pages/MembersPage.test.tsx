import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../../test/jsonResponse'
import { renderAppAt } from '../../../test/renderAppAt'
import { sessionFor } from '../../../test/sessionFor'
import { stubFetch, type FetchRoute } from '../../../test/stubFetch'

const mateus = { id: 'mateus-id', email: 'mateus@example.com', displayName: 'Mateus', role: 'admin', active: true }
const ana = { id: 'ana-id', email: 'ana@example.com', displayName: 'Ana', role: 'member', active: true }
const pendingInvite = {
  id: 'invite-1', email: 'bea@example.com', role: 'member', status: 'pending',
  expiresAt: '2026-10-18T20:00:00Z', createdAt: '2026-10-11T20:00:00Z',
}

const envelope = (items: unknown[]): { items: unknown[]; total: number; page: number; pageSize: number } => ({ items, total: items.length, page: 1, pageSize: items.length })

// stubMembers answers as the Admin Mateus, with Ana and one pending invite, plus any extra routes.
function stubMembers(extraRoutes: Record<string, FetchRoute> = {}): void {
  stubFetch({
    'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Mateus', { role: 'admin' })),
    'GET /api/v1/admin/users': () => jsonResponse(200, envelope([ana, mateus])),
    'GET /api/v1/admin/invites': () => jsonResponse(200, envelope([pendingInvite])),
    ...extraRoutes,
  })
}

// table returns the desktop table with name (Users or Invites).
async function table(name: string): Promise<HTMLElement> {
  return screen.findByRole('table', { name })
}

describe('MembersPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 4: lists every User with their Role and every Invite with its status', async () => {
    stubMembers()
    renderAppAt('/admin/members')

    const usersTable = await table('Users')
    expect(within(usersTable).getByText('ana@example.com')).toBeInTheDocument()
    expect(within(usersTable).getAllByText('Admin')).toHaveLength(1)
    const invitesTable = await table('Invites')
    expect(within(invitesTable).getByText('bea@example.com')).toBeInTheDocument()
    expect(within(invitesTable).getByText('Pending')).toBeInTheDocument()
  })

  it('card 1 acceptance criterion 1: sends an invite and shows its link to copy', async () => {
    const sent: unknown[] = []
    stubMembers({
      'POST /api/v1/admin/invites': async (request) => {
        sent.push(await request.json())
        return jsonResponse(201, { ...pendingInvite, id: 'invite-2', email: 'carl@example.com', link: 'http://localhost:5173/invite/tok', emailSent: true })
      },
    })
    renderAppAt('/admin/members')

    await userEvent.click(await screen.findByRole('button', { name: 'Invite' }))
    const dialog = screen.getByRole('dialog', { name: 'Invite someone' })
    await userEvent.type(within(dialog).getByLabelText('Email'), 'carl@example.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invite' }))

    expect(await within(dialog).findByText('Invite sent to carl@example.com.')).toBeInTheDocument()
    expect(within(dialog).getByTitle('http://localhost:5173/invite/tok')).toBeInTheDocument()
    expect(sent).toEqual([{ email: 'carl@example.com', role: 'member' }])
  })

  it('card 1 edge case: when the email fails, the link is there to send by hand', async () => {
    stubMembers({
      'POST /api/v1/admin/invites': () =>
        jsonResponse(201, { ...pendingInvite, email: 'carl@example.com', link: 'http://localhost:5173/invite/tok', emailSent: false }),
    })
    renderAppAt('/admin/members')

    await userEvent.click(await screen.findByRole('button', { name: 'Invite' }))
    const dialog = screen.getByRole('dialog', { name: 'Invite someone' })
    await userEvent.type(within(dialog).getByLabelText('Email'), 'carl@example.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invite' }))

    expect(await within(dialog).findByText('The email could not be sent. Copy the link and send it yourself.')).toBeInTheDocument()
    expect(within(dialog).getByTitle('http://localhost:5173/invite/tok')).toBeInTheDocument()
  })

  it('card 1 rule 2: an email with an account shows the card message', async () => {
    stubMembers({
      'POST /api/v1/admin/invites': () =>
        jsonResponse(400, { detail: 'Some fields are invalid.', errors: [{ field: 'email', message: 'This person already has an account.' }] }),
    })
    renderAppAt('/admin/members')

    await userEvent.click(await screen.findByRole('button', { name: 'Invite' }))
    const dialog = screen.getByRole('dialog', { name: 'Invite someone' })
    await userEvent.type(within(dialog).getByLabelText('Email'), 'ana@example.com')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invite' }))

    expect(await within(dialog).findByText('This person already has an account.')).toBeInTheDocument()
  })

  it('card 4 acceptance criterion 3: demoting the only Admin shows the card message', async () => {
    stubMembers({
      'PATCH /api/v1/admin/users/mateus-id': () => jsonResponse(409, { detail: 'There must be at least one admin.' }),
    })
    renderAppAt('/admin/members')

    await userEvent.click(within(await table('Users')).getByRole('button', { name: 'Make Mateus a member' }))
    const dialog = screen.getByRole('dialog', { name: 'Make Mateus a member?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Make member' }))

    expect(await within(dialog).findByText('There must be at least one admin.')).toBeInTheDocument()
  })

  it('card 4 rule 5: deactivates a User after confirming, and offers no Deactivate on yourself', async () => {
    const changes: unknown[] = []
    stubMembers({
      'PATCH /api/v1/admin/users/ana-id': async (request) => {
        changes.push(await request.json())
        return jsonResponse(200, { ...ana, active: false })
      },
    })
    renderAppAt('/admin/members')

    const usersTable = await table('Users')
    expect(within(usersTable).queryByRole('button', { name: 'Deactivate Mateus' })).not.toBeInTheDocument()
    await userEvent.click(within(usersTable).getByRole('button', { name: 'Deactivate Ana' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Deactivate Ana?' })).getByRole('button', { name: 'Deactivate' }))

    expect(changes).toEqual([{ active: false }])
  })

  it('card 1 rule 4: resends an invite and shows the new link', async () => {
    stubMembers({
      'POST /api/v1/admin/invites/invite-1/resend': () =>
        jsonResponse(200, { ...pendingInvite, link: 'http://localhost:5173/invite/fresh', emailSent: true }),
    })
    renderAppAt('/admin/members')

    await userEvent.click(within(await table('Invites')).getByRole('button', { name: 'Resend invite to bea@example.com' }))

    const dialog = await screen.findByRole('dialog', { name: 'Invite resent' })
    expect(within(dialog).getByTitle('http://localhost:5173/invite/fresh')).toBeInTheDocument()
  })

  it('card 4 rule 8: a Member who opens Members is sent to the Catalog and sees no Members link', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/filters': () => jsonResponse(200, []),
      'GET /api/v1/miniatures': () => jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 24, catalogTotal: 0 }),
    })
    renderAppAt('/admin/members')

    expect(await screen.findByRole('heading', { name: 'Catalog' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument()
  })

  it('cancels a pending invite', async () => {
    const cancelled: string[] = []
    stubMembers({
      'DELETE /api/v1/admin/invites/invite-1': () => {
        cancelled.push('invite-1')
        return new Response(null, { status: 204 })
      },
    })
    renderAppAt('/admin/members')

    await userEvent.click(within(await table('Invites')).getByRole('button', { name: 'Cancel invite to bea@example.com' }))

    await vi.waitFor(() => expect(cancelled).toEqual(['invite-1']))
  })

  it('card 4: reactivates a deactivated User after confirming', async () => {
    const changes: unknown[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Mateus', { role: 'admin' })),
      'GET /api/v1/admin/users': () => jsonResponse(200, envelope([mateus, { ...ana, active: false }])),
      'GET /api/v1/admin/invites': () => jsonResponse(200, envelope([])),
      'PATCH /api/v1/admin/users/ana-id': async (request) => {
        changes.push(await request.json())
        return jsonResponse(200, ana)
      },
    })
    renderAppAt('/admin/members')

    const usersTable = await table('Users')
    expect(within(usersTable).getByText('Deactivated')).toBeInTheDocument()
    expect(within(usersTable).queryByRole('button', { name: 'Deactivate Ana' })).not.toBeInTheDocument()
    await userEvent.click(within(usersTable).getByRole('button', { name: 'Reactivate Ana' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Reactivate Ana?' })).getByRole('button', { name: 'Reactivate' }))

    expect(changes).toEqual([{ active: true }])
  })
})
