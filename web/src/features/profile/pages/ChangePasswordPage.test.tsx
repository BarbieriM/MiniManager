import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../../test/jsonResponse'
import { renderAppAt } from '../../../test/renderAppAt'
import { sessionFor } from '../../../test/sessionFor'
import { stubFetch } from '../../../test/stubFetch'

async function changePassword(current: string, next: string): Promise<void> {
  await userEvent.type(await screen.findByLabelText('Current password'), current)
  await userEvent.type(screen.getByLabelText('New password'), next)
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ChangePasswordPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 3 acceptance criterion 2: a wrong current password shows the error', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'POST /api/v1/auth/password': () =>
        jsonResponse(400, { detail: 'Some fields are invalid.', errors: [{ field: 'currentPassword', message: 'Current password is incorrect.' }] }),
    })
    renderAppAt('/profile/password')

    await changePassword('wrong password', 'a brand new password')

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument()
  })

  it('card 3 rule 3: says the other devices were logged out', async () => {
    const changed: unknown[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'POST /api/v1/auth/password': async (request) => {
        changed.push(await request.json())
        return new Response(null, { status: 204 })
      },
    })
    renderAppAt('/profile/password')

    await changePassword('correct horse', 'a brand new password')

    expect(await screen.findByText('Password changed. Your other devices were logged out.')).toBeInTheDocument()
    expect(changed).toEqual([{ currentPassword: 'correct horse', newPassword: 'a brand new password' }])
  })
})
