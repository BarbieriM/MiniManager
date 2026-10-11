import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAtPath } from '../../../test/renderAtPath'
import type { CatalogItem } from '../internal/CatalogItem'
import { CatalogTable } from './CatalogTable'

const goblin: CatalogItem = {
  id: 'goblin-id',
  name: 'Goblin Boss',
  creatureSize: 'small',
  creatureType: 'humanoid',
  challengeRating: 1,
  paintStatus: 'hand_painted',
  quantity: 3,
  ownerName: 'Rafa Lima',
  ownerInitials: 'RL',
  isOwnedByCurrentUser: false,
  storageLocation: 'Box 3',
}

describe('CatalogTable', () => {
  it('shows one row per miniature with every column, the name linking to its details', () => {
    renderAtPath('/', <CatalogTable items={[goblin]} />)

    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(2)
    const row = within(rows[1])
    expect(row.getByRole('link', { name: 'Goblin Boss' })).toHaveAttribute('href', '/minis/goblin-id')
    expect(rows[1]).toHaveTextContent('Small')
    expect(rows[1]).toHaveTextContent('Humanoid')
    expect(rows[1]).toHaveTextContent('CR 1')
    expect(rows[1]).toHaveTextContent('Hand-painted')
    expect(rows[1]).toHaveTextContent('×3')
    expect(rows[1]).toHaveTextContent('Box 3')
    expect(row.getByLabelText('Owner: Rafa Lima')).toHaveTextContent('RL')
  })
})
