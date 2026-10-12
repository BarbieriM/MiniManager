import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ViewToggle } from './ViewToggle'

describe('ViewToggle', () => {
  it('marks the view shown and asks for the other one', async () => {
    const onChange = vi.fn()
    render(<ViewToggle value="table" onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Table view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Photo grid view' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Photo grid view' }))

    expect(onChange).toHaveBeenCalledWith('grid')
  })
})
