import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { filterDefinitionsFor } from '../../test/filterDefinitionsFor'
import { jsonResponse } from '../../test/jsonResponse'
import { miniatureFor } from '../../test/miniatureFor'
import { renderAppAt } from '../../test/renderAppAt'
import { sessionFor } from '../../test/sessionFor'
import { stubFetch } from '../../test/stubFetch'

const catalog = [miniatureFor('Goblin', { size: 'small' }), miniatureFor('Ogre', { size: 'large' }), miniatureFor('Troll', { size: 'large' })]

describe('FilterSheet', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('works on pending filters, counts them live, and only applies them on tap', async () => {
    const listQueries: URLSearchParams[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/filters': () => jsonResponse(200, filterDefinitionsFor()),
      'GET /api/v1/miniatures': (request) => {
        const query = new URL(request.url).searchParams
        listQueries.push(query)
        const sizes = query.getAll('size')
        const items = catalog.filter((miniature) => sizes.length === 0 || sizes.includes(miniature.size as string))
        return jsonResponse(200, { items, total: items.length, page: 1, pageSize: 24, catalogTotal: catalog.length })
      },
    })
    renderAppAt('/')

    await userEvent.click(await screen.findByRole('button', { name: 'Filters' }))
    const sheet = screen.getByRole('dialog', { name: 'Filters' })
    await userEvent.click(within(sheet).getByRole('checkbox', { name: /Large/ }))

    // The footer counts the pending filters, while the Catalog behind still lists everything.
    expect(await within(sheet).findByRole('button', { name: 'Show 2 minis' })).toBeInTheDocument()
    expect(screen.getByText('3 minis')).toBeInTheDocument()

    await userEvent.click(within(sheet).getByRole('button', { name: 'Show 2 minis' }))

    expect(await screen.findByText('2 of 3 minis')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument()
    expect(listQueries.at(-1)?.getAll('size')).toEqual(['large'])
    expect(listQueries.at(-1)?.get('pageSize')).toBe('24')
  })

  it('clears the filters in the sheet but keeps the search, which is not in it', async () => {
    const listQueries: URLSearchParams[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/filters': () => jsonResponse(200, filterDefinitionsFor()),
      'GET /api/v1/miniatures': (request) => {
        listQueries.push(new URL(request.url).searchParams)
        return jsonResponse(200, { items: catalog, total: catalog.length, page: 1, pageSize: 24, catalogTotal: catalog.length })
      },
    })
    renderAppAt('/?q=gob&size=large')

    await userEvent.click(await screen.findByRole('button', { name: 'Filters (1)' }))
    const sheet = screen.getByRole('dialog', { name: 'Filters' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Clear all' }))
    await userEvent.click(await within(sheet).findByRole('button', { name: 'Show 3 minis' }))

    // The list behind asks for 24 per page; the sheet's live count asks for 1.
    await waitFor(() => expect(listQueries.filter((query) => query.get('pageSize') === '24').at(-1)?.has('size')).toBe(false))
    expect(listQueries.at(-1)?.get('q')).toBe('gob')
  })
})
