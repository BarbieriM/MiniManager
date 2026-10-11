import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAtPath } from '../../../test/renderAtPath'
import type { CatalogItem } from '../internal/CatalogItem'
import { CatalogCard } from './CatalogCard'

const ogre: CatalogItem = {
  id: 'ogre-id',
  name: 'Ogre',
  creatureSize: 'large',
  creatureType: 'giant',
  challengeRating: 2,
  paintStatus: 'unpainted',
  quantity: 1,
  ownerName: 'Ana',
  ownerInitials: 'AN',
  isOwnedByCurrentUser: true,
  storageLocation: '',
}

describe('CatalogCard', () => {
  it('is one link to the details, naming the miniature and its stats', () => {
    renderAtPath('/', <CatalogCard item={ogre} />)

    const card = screen.getByRole('link', { name: /Ogre/ })
    expect(card).toHaveAttribute('href', '/minis/ogre-id')
    expect(card).toHaveTextContent('CR 2')
    expect(card).toHaveTextContent('×1')
    expect(screen.getByLabelText('Owner: Ana')).toHaveTextContent('AN')
    expect(screen.getByLabelText('Unpainted')).toBeInTheDocument()
  })
})
