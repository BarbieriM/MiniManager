import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { filterDefinitionsFor } from '../../../test/filterDefinitionsFor'
import { jsonResponse } from '../../../test/jsonResponse'
import { miniatureFor } from '../../../test/miniatureFor'
import { renderAppAt } from '../../../test/renderAppAt'
import { sessionFor } from '../../../test/sessionFor'
import { stubFetch } from '../../../test/stubFetch'

const catalog = [
  miniatureFor('Goblin', { size: 'small' }),
  miniatureFor('Hobgoblin', { size: 'medium' }),
  miniatureFor('Ogre', { size: 'large', creatureType: 'giant' }),
]

// stubCatalog answers the list by filtering the three minis on size, and records every list query it receives.
function stubCatalog(): URLSearchParams[] {
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
  return listQueries
}

async function rail(): Promise<HTMLElement> {
  return screen.findByRole('complementary', { name: 'Filters' })
}

describe('FilterControls', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 6 rule 2: ticking two sizes lists both, and shows how many of the Catalog match', async () => {
    const listQueries = stubCatalog()
    renderAppAt('/')

    const filters = await rail()
    await userEvent.click(await within(filters).findByRole('checkbox', { name: /Small/ }))
    await userEvent.click(within(filters).getByRole('checkbox', { name: /Medium/ }))

    expect(await screen.findByText('2 of 3 minis')).toBeInTheDocument()
    expect(listQueries.at(-1)?.getAll('size')).toEqual(['small', 'medium'])
  })

  it('card 6 acceptance criterion 3: opening a filtered URL on page 2 restores the filters and the page', async () => {
    const listQueries = stubCatalog()
    renderAppAt('/?size=small&size=medium&page=2')

    const filters = await rail()
    expect(await within(filters).findByRole('checkbox', { name: /Small/ })).toBeChecked()
    expect(within(filters).getByRole('checkbox', { name: /Medium/ })).toBeChecked()
    expect(within(filters).getByRole('checkbox', { name: /Large/ })).not.toBeChecked()
    expect(listQueries[0].getAll('size')).toEqual(['small', 'medium'])
    expect(listQueries[0].get('page')).toBe('2')
  })

  it('card 6 acceptance criterion 4: a minimum CR above the maximum shows the error and is not applied', async () => {
    const listQueries = stubCatalog()
    renderAppAt('/')
    const filters = await rail()

    await userEvent.selectOptions(await within(filters).findByRole('combobox', { name: 'Minimum CR' }), '5')
    await userEvent.selectOptions(within(filters).getByRole('combobox', { name: 'Maximum CR' }), '2')

    expect(within(filters).getByText('Minimum CR cannot be higher than maximum CR.')).toBeInTheDocument()
    expect(listQueries.at(-1)?.get('crMin')).toBe('5')
    expect(listQueries.at(-1)?.has('crMax')).toBe(false)
  })

  it('card 6 rule 3: tags can switch from match any to match all', async () => {
    const listQueries = stubCatalog()
    renderAppAt('/?tags=goblinoid')

    await userEvent.click(await within(await rail()).findByRole('radio', { name: 'Match all' }))

    await screen.findAllByRole('link', { name: /Goblin/ })
    expect(listQueries.at(-1)?.get('tagMatch')).toBe('all')
    expect(listQueries.at(-1)?.getAll('tags')).toEqual(['goblinoid'])
  })

  it('card 6 rule 6: Back restores the previous filters, and the Challenge Rating range follows', async () => {
    const listQueries = stubCatalog()
    const { router } = renderAppAt('/')
    const filters = await rail()

    await userEvent.selectOptions(await within(filters).findByRole('combobox', { name: 'Minimum CR' }), '1')
    await screen.findByRole('button', { name: /Remove filter Minimum CR/ })
    await act(() => router.navigate(-1))

    expect(within(filters).getByRole('combobox', { name: 'Minimum CR' })).toHaveValue('')
    expect(screen.queryByRole('button', { name: /Remove filter Minimum CR/ })).not.toBeInTheDocument()
    expect(listQueries.at(-1)?.has('crMin')).toBe(false)
  })

  it('the Challenge Rating range follows a removed chip, and does not write the removed bound back', async () => {
    const listQueries = stubCatalog()
    renderAppAt('/?crMin=1&crMax=5')
    const filters = await rail()

    await userEvent.click(await screen.findByRole('button', { name: /Remove filter Minimum CR/ }))
    expect(within(filters).getByRole('combobox', { name: 'Minimum CR' })).toHaveValue('')
    await userEvent.selectOptions(within(filters).getByRole('combobox', { name: 'Maximum CR' }), '2')

    await screen.findByRole('button', { name: /Remove filter Maximum CR: CR 2/ })
    expect(listQueries.at(-1)?.has('crMin')).toBe(false)
    expect(listQueries.at(-1)?.get('crMax')).toBe('2')
  })
})
