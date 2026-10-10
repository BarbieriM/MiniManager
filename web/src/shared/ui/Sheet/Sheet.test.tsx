import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { pressEscape } from '../../../test/pressEscape'
import { Button } from '../Button/Button'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('closes with its close button and on Esc', async () => {
    function Demo(): ReactElement {
      const [open, setOpen] = useState(true)
      return (
        <>
          <Sheet open={open} onClose={() => setOpen(false)} title="Filters">
            <p>Size</p>
          </Sheet>
          {!open && <Button onClick={() => setOpen(true)}>Filters</Button>}
        </>
      )
    }
    render(<Demo />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    pressEscape(screen.getByRole('dialog', { name: 'Filters' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
