import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../test/jsonResponse'
import { miniatureFor } from '../../test/miniatureFor'
import { renderAppAt } from '../../test/renderAppAt'
import { sessionFor } from '../../test/sessionFor'
import { stubFetch } from '../../test/stubFetch'

async function pickOption(fieldName: RegExp, optionName: string): Promise<void> {
  await userEvent.click(screen.getByRole('combobox', { name: fieldName }))
  await userEvent.click(screen.getByRole('option', { name: optionName }))
}

const owners = { items: [{ id: 'mateus-id', displayName: 'Mateus' }, { id: 'rafa-id', displayName: 'Rafa' }], total: 2, page: 1, pageSize: 2 }

describe('MiniatureFormPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 5 acceptance criterion 1: adds a mini with only name, type and size, then finds it in the Catalog', async () => {
    let sentBody: Record<string, unknown> = {}
    const catalog: Record<string, unknown>[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'POST /api/v1/miniatures': async (request) => {
        sentBody = (await request.json()) as Record<string, unknown>
        catalog.push(miniatureFor('Goblin'))
        return jsonResponse(201, miniatureFor('Goblin'))
      },
      'GET /api/v1/miniatures/goblin-id': () => jsonResponse(200, miniatureFor('Goblin')),
      'GET /api/v1/miniatures': () => jsonResponse(200, { items: catalog, total: catalog.length, page: 1, pageSize: 24 }),
    })
    renderAppAt('/minis/new')

    await userEvent.type(await screen.findByLabelText('Name'), 'Goblin')
    await pickOption(/Type/, 'Humanoid')
    await pickOption(/Size/, 'Small')
    expect(screen.queryByRole('combobox', { name: /Owner/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Save miniature' })[0])

    expect(await screen.findByRole('heading', { name: 'Goblin' })).toBeInTheDocument()
    expect(sentBody).toMatchObject({ name: 'Goblin', creatureType: 'humanoid', size: 'small', quantity: 1, paintStatus: 'unpainted', tags: [] })
    expect(sentBody).not.toHaveProperty('ownerId')

    await userEvent.click(screen.getAllByRole('link', { name: 'Catalog' })[0])
    expect(await screen.findByText('1 mini')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Goblin/ }).length).toBeGreaterThan(0)
  })

  it('card 4 rule 4: an Admin picks the owner from the active Users', async () => {
    let sentBody: Record<string, unknown> = {}
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Mateus', { role: 'admin' })),
      'GET /api/v1/users/options': () => jsonResponse(200, owners),
      'POST /api/v1/miniatures': async (request) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return jsonResponse(201, miniatureFor('Goblin'))
      },
      'GET /api/v1/miniatures/goblin-id': () => jsonResponse(200, miniatureFor('Goblin')),
    })
    renderAppAt('/minis/new')

    await userEvent.type(await screen.findByLabelText('Name'), 'Goblin')
    await pickOption(/Type/, 'Humanoid')
    await pickOption(/Size/, 'Small')
    await pickOption(/Owner/, 'Rafa')
    await userEvent.click(screen.getAllByRole('button', { name: 'Save miniature' })[0])

    await screen.findByRole('heading', { name: 'Goblin' })
    expect(sentBody).toMatchObject({ ownerId: 'rafa-id' })
  })

  it('shows the API field errors next to their fields and saves nothing', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'POST /api/v1/miniatures': () =>
        jsonResponse(400, { status: 400, detail: 'Some fields are invalid.', errors: [{ field: 'tags', message: 'A miniature can have at most 20 tags.' }] }),
    })
    renderAppAt('/minis/new')

    await userEvent.type(await screen.findByLabelText('Name'), 'Goblin')
    await pickOption(/Type/, 'Humanoid')
    await pickOption(/Size/, 'Small')
    await userEvent.click(screen.getAllByRole('button', { name: 'Save miniature' })[0])

    expect(await screen.findByText('A miniature can have at most 20 tags.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add miniature' })).toBeInTheDocument()
  })

  it('card 5 rule 1: typing quantity 0 offers deleting the miniature instead', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/miniatures/goblin-id': () => jsonResponse(200, miniatureFor('Goblin', { quantity: 2 })),
    })
    renderAppAt('/minis/goblin-id/edit')

    const quantity = await screen.findByLabelText('Quantity')
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '0')

    // Offered as soon as 0 is typed, before any save attempt.
    await userEvent.click(await screen.findByRole('button', { name: 'Delete this miniature instead' }))
    expect(screen.getByRole('dialog', { name: 'Delete Goblin?' })).toBeInTheDocument()
  })

  it('card 5 acceptance criterion 3: a conflicting save shows the conflict message with Reload only', async () => {
    let loads = 0
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/miniatures/goblin-id': () => {
        loads += 1
        return jsonResponse(200, miniatureFor(loads === 1 ? 'Goblin' : 'Goblin Boss', { version: loads }))
      },
      'PUT /api/v1/miniatures/goblin-id': () =>
        jsonResponse(409, { status: 409, detail: 'Someone changed this miniature while you were editing. Reload to see their changes.' }),
    })
    renderAppAt('/minis/goblin-id/edit')

    await userEvent.type(await screen.findByLabelText('Name'), ' Warrior')
    await userEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[0])

    const dialog = await screen.findByRole('dialog', { name: 'This miniature changed' })
    expect(dialog).toHaveTextContent('Someone changed this miniature while you were editing. Reload to see their changes.')
    expect(within(dialog).getAllByRole('button').map((button) => button.textContent)).toEqual(['Reload'])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reload' }))

    expect(await screen.findByDisplayValue('Goblin Boss')).toBeInTheDocument()
  })

  it('card 6: the tag field suggests the tags already in use', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/tags': () =>
        jsonResponse(200, { items: [{ value: 'goblinoid', label: 'goblinoid', count: 4 }, { value: 'faction:drow', label: 'faction:drow', count: 2 }], total: 2, page: 1, pageSize: 2 }),
    })
    renderAppAt('/minis/new')

    await userEvent.type(await screen.findByRole('combobox', { name: /Tags/ }), 'gob')

    expect(await screen.findByRole('option', { name: /goblinoid/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /faction:drow/ })).not.toBeInTheDocument()
  })
})
