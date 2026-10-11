import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../test/jsonResponse'
import { renderAppAt } from '../../test/renderAppAt'
import { sessionFor } from '../../test/sessionFor'
import { stubFetch } from '../../test/stubFetch'

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
})
