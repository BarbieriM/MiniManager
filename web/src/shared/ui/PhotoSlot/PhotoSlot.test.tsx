import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PhotoSlot } from './PhotoSlot'

describe('PhotoSlot', () => {
  it('offers "set as cover" only on photos that are not the cover', async () => {
    const onSetCover = vi.fn()
    const { rerender } = render(<PhotoSlot state="uploaded" creatureSize="small" alt="Goblin Boss" isCover onSetCover={onSetCover} onRemove={() => {}} />)
    expect(screen.getByText('Cover')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set as cover' })).not.toBeInTheDocument()
    rerender(<PhotoSlot state="uploaded" creatureSize="small" alt="Goblin Boss" isCover={false} onSetCover={onSetCover} onRemove={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Set as cover' }))
    expect(onSetCover).toHaveBeenCalledOnce()
  })

  it('reports upload progress', () => {
    render(<PhotoSlot state="uploading" creatureSize="small" progress={62} />)
    expect(screen.getByRole('progressbar', { name: 'Uploading photo' })).toHaveAttribute('aria-valuenow', '62')
  })
})
