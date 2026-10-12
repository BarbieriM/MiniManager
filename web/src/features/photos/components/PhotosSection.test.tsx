import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../../../test/jsonResponse'
import { miniatureFor } from '../../../test/miniatureFor'
import { renderAppAt } from '../../../test/renderAppAt'
import { sessionFor } from '../../../test/sessionFor'
import { stubFetch, type FetchRoute } from '../../../test/stubFetch'
import { stubUpload } from '../../../test/stubUpload'

const coverPhoto = { id: 'p1', thumbnailUrl: 'https://images.test/thumbnail/p1', fullUrl: 'https://images.test/full/p1', isCover: true }
const secondPhoto = { id: 'p2', thumbnailUrl: 'https://images.test/thumbnail/p2', fullUrl: 'https://images.test/full/p2', isCover: false }
const signedUpload = { photoId: 'p1', url: 'https://api.cloudinary.test/v1_1/minis/image/upload', fields: { public_id: 'minis/goblin-id/p1', signature: 'signed' } }

// stubGoblin answers as Ana, owner of a Goblin whose details hold photos (photos on), plus extra routes.
function stubGoblin(photos: () => unknown[], extraRoutes: Record<string, FetchRoute> = {}): void {
  stubFetch({
    'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
    'GET /api/v1/miniatures/goblin-id': () => jsonResponse(200, miniatureFor('Goblin', { photos: photos(), photosEnabled: true })),
    'GET /api/v1/users/options': () => jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 0 }),
    'GET /api/v1/tags': () => jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 0 }),
    ...extraRoutes,
  })
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('no file input')
  return input
}

const jpeg = (megabytes: number): File => new File([new Uint8Array(megabytes * 1024 * 1024)], 'goblin.jpg', { type: 'image/jpeg' })

describe('PhotosSection', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('card 7 acceptance criterion 1: uploads a photo with its progress and it becomes the cover', async () => {
    let photos: unknown[] = []
    const registered: unknown[] = []
    const uploads = stubUpload()
    stubGoblin(() => photos, {
      'POST /api/v1/miniatures/goblin-id/photos/signature': () => jsonResponse(200, signedUpload),
      'POST /api/v1/miniatures/goblin-id/photos': async (request) => {
        registered.push(await request.json())
        photos = [coverPhoto]
        return jsonResponse(201, coverPhoto)
      },
    })
    renderAppAt('/minis/goblin-id/edit')

    await screen.findByRole('heading', { name: 'Photos' })
    await userEvent.upload(fileInput(), jpeg(3))
    await waitFor(() => expect(uploads).toHaveLength(1))
    act(() => uploads[0].progress(40))
    expect(await screen.findByRole('progressbar', { name: 'Uploading photo' })).toHaveAttribute('aria-valuenow', '40')
    act(() => uploads[0].succeed())

    expect(await screen.findByRole('img', { name: 'Photo 1 of Goblin' })).toHaveAttribute('src', coverPhoto.thumbnailUrl)
    expect(screen.getByText('Cover')).toBeInTheDocument()
    expect(uploads[0].url).toBe(signedUpload.url)
    expect(uploads[0].form.get('public_id')).toBe('minis/goblin-id/p1')
    expect(uploads[0].form.get('file')).toBeInstanceOf(File)
    expect(registered).toEqual([{ photoId: 'p1' }])
  })

  it('card 7 rule 2: checks the type and size in the browser before uploading', async () => {
    const fetchMock = vi.fn()
    stubGoblin(() => [], { 'POST /api/v1/miniatures/goblin-id/photos/signature': () => fetchMock() })
    renderAppAt('/minis/goblin-id/edit')
    const user = userEvent.setup({ applyAccept: false })

    await screen.findByRole('heading', { name: 'Photos' })
    await user.upload(fileInput(), jpeg(10))
    expect(await screen.findByText('Images must be 5 MB or smaller.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    await user.upload(fileInput(), new File(['gif'], 'goblin.gif', { type: 'image/gif' }))
    expect(await screen.findByText('Use a JPEG, PNG or WebP image.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('card 7 rule 1: the server refusing a 4th photo shows its message', async () => {
    stubGoblin(() => [], {
      'POST /api/v1/miniatures/goblin-id/photos/signature': () =>
        jsonResponse(400, { detail: 'Some fields are invalid.', errors: [{ field: 'photo', message: 'A miniature can have up to 3 photos.' }] }),
    })
    renderAppAt('/minis/goblin-id/edit')

    await screen.findByRole('heading', { name: 'Photos' })
    await userEvent.upload(fileInput(), jpeg(1))

    expect(await screen.findByText('A miniature can have up to 3 photos.')).toBeInTheDocument()
  })

  it('card 7 edge case: an upload that fails halfway can be retried, and nothing is saved meanwhile', async () => {
    let photos: unknown[] = []
    const registered: unknown[] = []
    const uploads = stubUpload()
    stubGoblin(() => photos, {
      'POST /api/v1/miniatures/goblin-id/photos/signature': () => jsonResponse(200, signedUpload),
      'POST /api/v1/miniatures/goblin-id/photos': async (request) => {
        registered.push(await request.json())
        photos = [coverPhoto]
        return jsonResponse(201, coverPhoto)
      },
    })
    renderAppAt('/minis/goblin-id/edit')

    await screen.findByRole('heading', { name: 'Photos' })
    await userEvent.upload(fileInput(), jpeg(3))
    await waitFor(() => expect(uploads).toHaveLength(1))
    act(() => uploads[0].fail())
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(registered).toEqual([])

    await waitFor(() => expect(uploads).toHaveLength(2))
    act(() => uploads[1].succeed())
    expect(await screen.findByRole('img', { name: 'Photo 1 of Goblin' })).toBeInTheDocument()
  })

  it('card 7 edge case: a server failure while saving also offers Retry', async () => {
    let failRegister = true
    const uploads = stubUpload()
    stubGoblin(() => [], {
      'POST /api/v1/miniatures/goblin-id/photos/signature': () => jsonResponse(200, signedUpload),
      'POST /api/v1/miniatures/goblin-id/photos': () =>
        failRegister ? jsonResponse(503, { detail: 'Something went wrong. Try again.' }) : jsonResponse(201, coverPhoto),
    })
    renderAppAt('/minis/goblin-id/edit')

    await screen.findByRole('heading', { name: 'Photos' })
    await userEvent.upload(fileInput(), jpeg(3))
    await waitFor(() => expect(uploads).toHaveLength(1))
    act(() => uploads[0].succeed())

    expect(await screen.findByText('Something went wrong. Try again.')).toBeInTheDocument()
    failRegister = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(uploads).toHaveLength(2))
  })

  it('card 7 rule 3: makes another photo the cover', async () => {
    const changes: unknown[] = []
    stubGoblin(() => [coverPhoto, secondPhoto], {
      'PATCH /api/v1/miniatures/goblin-id/photos/p2': async (request) => {
        changes.push(await request.json())
        return jsonResponse(200, { photos: [{ ...coverPhoto, isCover: false }, { ...secondPhoto, isCover: true }] })
      },
    })
    renderAppAt('/minis/goblin-id/edit')

    await userEvent.click(await screen.findByRole('button', { name: 'Set as cover' }))

    await waitFor(() => expect(changes).toEqual([{ isCover: true }]))
  })

  it('card 7 rule 6: removes a photo after confirming', async () => {
    const removed: string[] = []
    stubGoblin(() => [coverPhoto], {
      'DELETE /api/v1/miniatures/goblin-id/photos/p1': () => {
        removed.push('p1')
        return new Response(null, { status: 204 })
      },
    })
    renderAppAt('/minis/goblin-id/edit')

    await userEvent.click(await screen.findByRole('button', { name: 'Remove photo' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove this photo?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove photo' }))

    await waitFor(() => expect(removed).toEqual(['p1']))
  })

  it('shows no Photos section when photos are not set up', async () => {
    stubFetch({
      'POST /api/v1/auth/refresh': () => jsonResponse(200, sessionFor('Ana')),
      'GET /api/v1/miniatures/goblin-id': () => jsonResponse(200, miniatureFor('Goblin')),
      'GET /api/v1/users/options': () => jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 0 }),
      'GET /api/v1/tags': () => jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 0 }),
    })
    renderAppAt('/minis/goblin-id/edit')

    await screen.findByRole('heading', { name: 'Edit Goblin' })
    expect(screen.queryByRole('heading', { name: 'Photos' })).not.toBeInTheDocument()
  })
})
