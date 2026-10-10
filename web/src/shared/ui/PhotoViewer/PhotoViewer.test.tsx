import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PhotoViewer } from './PhotoViewer'

describe('PhotoViewer', () => {
  it('card 7 rule 8: shows a size placeholder when there is no photo', () => {
    render(<PhotoViewer photos={[]} creatureSize="large" />)
    expect(screen.getByText('No photo yet')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Large' })).toBeInTheDocument()
  })

  it('switches photos from the thumbnails', async () => {
    const photos = [
      { id: 'a', alt: 'Front', isCover: true },
      { id: 'b', alt: 'Back', isCover: false },
      { id: 'c', alt: 'Base', isCover: false },
    ]
    render(<PhotoViewer photos={photos} creatureSize="small" />)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show photo 3 of 3' }))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show photo 3 of 3' })).toHaveAttribute('aria-pressed', 'true')
  })
})
