import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CatalogItem } from '../internal/CatalogItem'
import { GridTile } from './GridTile'

const goblin: CatalogItem = {
  id: 'goblin-id',
  name: 'Goblin',
  creatureSize: 'small',
  creatureType: 'humanoid',
  challengeRating: 0.25,
  paintStatus: 'hand_painted',
  quantity: 4,
  ownerName: 'Ana',
  ownerInitials: 'AN',
  isOwnedByCurrentUser: false,
  storageLocation: '',
  coverThumbnailUrl: 'https://images.test/goblin.jpg',
}

describe('GridTile', () => {
  it('links to the mini and shows its cover, Owner, name, size and quantity, with no CR or paint', () => {
    render(
      <MemoryRouter>
        <GridTile item={goblin} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/minis/goblin-id')
    expect(screen.getByRole('img', { name: 'Cover photo of Goblin' })).toBeInTheDocument()
    expect(screen.getByLabelText('Owner: Ana')).toBeInTheDocument()
    expect(screen.getByText('Small')).toBeInTheDocument()
    expect(screen.getByText('×4')).toBeInTheDocument()
    expect(screen.queryByText(/CR/)).not.toBeInTheDocument()
    expect(screen.queryByText('Hand-painted')).not.toBeInTheDocument()
  })
})
