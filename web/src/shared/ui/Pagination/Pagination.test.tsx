import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('card 5 rule 10: shows the range of 24 on this page', () => {
    render(<Pagination page={2} pageSize={24} total={60} onPageChange={() => {}} />)
    expect(screen.getByText('25–48 of 60')).toBeInTheDocument()
    expect(screen.getByText('of 3')).toBeInTheDocument()
  })

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(<Pagination page={1} pageSize={24} total={60} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    rerender(<Pagination page={3} pageSize={24} total={60} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByText('49–60 of 60')).toBeInTheDocument()
  })

  it('jumps to a typed page, keeping it within range', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} pageSize={24} total={312} onPageChange={onPageChange} />)
    const box = screen.getByRole('textbox', { name: 'Page number' })
    await userEvent.clear(box)
    await userEvent.type(box, '99{Enter}')
    expect(onPageChange).toHaveBeenCalledWith(13)
  })
})
