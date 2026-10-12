import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TileGrid } from './TileGrid'

describe('TileGrid', () => {
  it('lays out every tile it is given', () => {
    render(
      <TileGrid>
        <span>Goblin</span>
        <span>Ogre</span>
      </TileGrid>,
    )
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('Ogre')).toBeInTheDocument()
  })
})
