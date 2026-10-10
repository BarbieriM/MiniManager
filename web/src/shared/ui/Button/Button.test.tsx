import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('ignores clicks while loading and says it is busy', async () => {
    const onClick = vi.fn()
    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
