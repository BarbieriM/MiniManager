import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../test/jsonResponse'
import { miniatureFor } from '../../test/miniatureFor'
import { renderAppAt } from '../../test/renderAppAt'
import { sessionFor } from '../../test/sessionFor'
import { stubFetch } from '../../test/stubFetch'

const pageOf = (names: string[], page: number, total: number): Record<string, unknown> => ({
  items: names.map((name) => miniatureFor(name)),
  total,
  page,
  pageSize: 24,
})

describe('CatalogPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 5 rule 10: shows a page of 24 and pages through the rest', async () => {
    const requestedPages: string[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/miniatures': (request) => {
        const page = new URL(request.url).searchParams.get('page') ?? '1'
        requestedPages.push(page)
        return jsonResponse(200, page === '1' ? pageOf(['Bugbear', 'Goblin'], 1, 60) : pageOf(['Ogre'], 2, 60))
      },
    })
    renderAppAt('/')

    expect((await screen.findAllByRole('link', { name: /Bugbear/ })).length).toBeGreaterThan(0)
    expect(screen.getByText('60 minis')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect((await screen.findAllByRole('link', { name: /Ogre/ })).length).toBeGreaterThan(0)
    expect(requestedPages).toEqual(['1', '2'])
  })

  it('offers adding the first miniature when the Catalog is empty', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/miniatures': () => jsonResponse(200, pageOf([], 1, 0)),
    })
    renderAppAt('/')

    expect(await screen.findByRole('link', { name: 'Add your first miniature' })).toHaveAttribute('href', '/minis/new')
  })

  it('refreshes an expired access token once and retries the request', async () => {
    let refreshes = 0
    const authorizations: (string | null)[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => {
        refreshes += 1
        return jsonResponse(200, sessionFor('Ana', { accessToken: `token-${refreshes}` }))
      },
      'GET /api/v1/miniatures': (request) => {
        authorizations.push(request.headers.get('Authorization'))
        return authorizations.length === 1
          ? jsonResponse(401, { status: 401, detail: 'Your session has ended. Log in again.' })
          : jsonResponse(200, pageOf(['Goblin'], 1, 1))
      },
    })
    renderAppAt('/')

    expect((await screen.findAllByRole('link', { name: /Goblin/ })).length).toBeGreaterThan(0)
    expect(authorizations).toEqual(['Bearer token-1', 'Bearer token-2'])
  })

  it('stays logged in when the token refresh fails for a network reason, such as a server still waking up', async () => {
    let refreshes = 0
    stubFetch({
      'POST /api/v1/auth/refresh': () => {
        refreshes += 1
        if (refreshes === 1) return jsonResponse(200, sessionFor('Ana'))
        throw new TypeError('Failed to fetch')
      },
      'GET /api/v1/miniatures': () => jsonResponse(401, { status: 401, detail: 'Your session has ended. Log in again.' }),
    })
    renderAppAt('/')

    // Network failures are retried twice (about 3 s) before the error shows, which suits a waking server.
    expect(await screen.findByText('The Catalog could not be loaded. Try again.', {}, { timeout: 6000 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument()
  }, 10_000)
})
