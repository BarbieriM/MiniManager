import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../test/jsonResponse'
import { miniatureFor } from '../../test/miniatureFor'
import { renderAppAt } from '../../test/renderAppAt'
import { sessionFor } from '../../test/sessionFor'
import { stubFetch } from '../../test/stubFetch'

const rafasOgre = miniatureFor('Ogre', {
  owner: { id: 'rafa-id', displayName: 'Rafa' },
  creatureType: 'giant',
  size: 'large',
  challengeRating: 2,
  tags: ['faction:zhentarim'],
  storageLocation: 'Box 3',
  canChange: false,
})

describe('MiniatureDetailsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("card 4 acceptance criterion 1: a Member sees someone else's mini with no edit or delete", async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/miniatures/ogre-id': () => jsonResponse(200, rafasOgre),
    })
    renderAppAt('/minis/ogre-id')

    expect(await screen.findByRole('heading', { name: 'Ogre' })).toBeInTheDocument()
    expect(screen.getByText('Giant')).toBeInTheDocument()
    // Tag draws the namespace in its own element, so match the combined text.
    expect(document.body).toHaveTextContent('faction:zhentarim')
    expect(screen.getByText('Box 3')).toBeInTheDocument()
    expect(screen.getByText(/Only Rafa or an admin can edit or delete it/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('card 5 acceptance criterion 4: deleting after confirming returns to the Catalog', async () => {
    const deleted: string[] = []
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Rafa')),
      'GET /api/v1/miniatures/ogre-id': () => jsonResponse(200, { ...rafasOgre, canChange: true }),
      'DELETE /api/v1/miniatures/ogre-id': () => {
        deleted.push('ogre-id')
        return new Response(null, { status: 204 })
      },
      'GET /api/v1/miniatures': () => jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 24 }),
    })
    renderAppAt('/minis/ogre-id')

    expect((await screen.findAllByRole('link', { name: 'Edit' }))[0]).toHaveAttribute('href', '/minis/ogre-id/edit')
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Delete Ogre?' })
    expect(deleted).toEqual([])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete Ogre' }))

    expect(await screen.findByRole('heading', { name: 'Catalog' })).toBeInTheDocument()
    expect(deleted).toEqual(['ogre-id'])
  })

  it('shows a not-found page with a link back for a deleted miniature', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/miniatures/gone-id': () => jsonResponse(404, { status: 404, detail: 'This miniature no longer exists.' }),
    })
    renderAppAt('/minis/gone-id')

    expect(await screen.findByText('This miniature no longer exists.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Catalog' })).toHaveAttribute('href', '/')
  })
})
