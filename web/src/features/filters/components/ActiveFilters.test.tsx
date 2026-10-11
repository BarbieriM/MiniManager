import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { filterDefinitionsFor } from '../../../test/filterDefinitionsFor'
import { jsonResponse } from '../../../test/jsonResponse'
import { miniatureFor } from '../../../test/miniatureFor'
import { renderAppAt } from '../../../test/renderAppAt'
import { sessionFor } from '../../../test/sessionFor'
import { stubFetch } from '../../../test/stubFetch'

// stubCatalog answers every list request with items (or none), recording the queries.
function stubCatalog(items: Record<string, unknown>[]): URLSearchParams[] {
  const listQueries: URLSearchParams[] = []
  stubFetch({
    'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
    'GET /api/v1/filters': () => jsonResponse(200, filterDefinitionsFor([{ id: 'rafa-id', displayName: 'Rafa', count: 4 }])),
    'GET /api/v1/miniatures': (request) => {
      listQueries.push(new URL(request.url).searchParams)
      return jsonResponse(200, { items, total: items.length, page: 1, pageSize: 24, catalogTotal: 3 })
    },
  })
  return listQueries
}

describe('ActiveFilters', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a chip per active value, by its label, and removes one value at a time', async () => {
    const listQueries = stubCatalog([miniatureFor('Goblin')])
    renderAppAt('/?size=small&size=medium&owner=rafa-id&sort=-name')

    expect(await screen.findByRole('button', { name: 'Remove filter Owner: Rafa' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter Size: Small' }))

    await screen.findAllByRole('link', { name: /Goblin/ })
    expect(listQueries.at(-1)?.getAll('size')).toEqual(['medium'])
    expect(screen.queryByRole('button', { name: 'Remove filter Size: Small' })).not.toBeInTheDocument()
  })

  it('clears every filter but keeps the sort', async () => {
    const listQueries = stubCatalog([miniatureFor('Goblin')])
    renderAppAt('/?size=small&tags=goblinoid&tagMatch=all&sort=-name&page=2')

    await userEvent.click(await screen.findByRole('button', { name: 'Clear all' }))

    await screen.findByText('1 mini')
    expect(listQueries.at(-1)?.toString()).toBe('pageSize=24&sort=-name')
  })

  it('says when nothing matches and offers to clear the filters', async () => {
    const listQueries = stubCatalog([])
    renderAppAt('/?size=gargantuan')

    expect(await screen.findByText('No miniatures match these filters.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    // Without filters an empty answer means an empty Catalog, so the first-use message shows instead.
    expect(await screen.findByText('No miniatures yet')).toBeInTheDocument()
    expect(listQueries.at(-1)?.has('size')).toBe(false)
  })

  it('card 6 rule 8: shows why the API refused a filter from a hand-edited link', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/filters': () => jsonResponse(200, filterDefinitionsFor()),
      'GET /api/v1/miniatures': () =>
        jsonResponse(400, { detail: 'Some fields are invalid.', errors: [{ field: 'size', message: 'Pick sizes from the list.' }] }),
    })
    renderAppAt('/?size=colossal')

    expect(await screen.findByText(/Pick sizes from the list\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })
})
