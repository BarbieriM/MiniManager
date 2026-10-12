import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CoverThumbnail } from './CoverThumbnail'

describe('CoverThumbnail', () => {
  it('shows the cover photo', () => {
    render(<CoverThumbnail url="https://images.test/goblin.jpg" creatureSize="small" miniatureName="Goblin" />)
    expect(screen.getByRole('img', { name: 'Cover photo of Goblin' })).toHaveAttribute('src', 'https://images.test/goblin.jpg')
  })

  it('card 7 rule 8: a mini without photos shows its size placeholder', () => {
    render(<CoverThumbnail url={null} creatureSize="large" miniatureName="Ogre" />)
    expect(screen.queryByRole('img', { name: 'Cover photo of Ogre' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Large')).toBeInTheDocument()
  })
})
