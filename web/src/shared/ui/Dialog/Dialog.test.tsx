import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { pressEscape } from '../../../test/pressEscape'
import { Button } from '../Button/Button'
import { Dialog } from './Dialog'

function DeleteDialogDemo({ busy = false }: { busy?: boolean }): ReactElement {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Delete</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        isSaving={busy}
        title="Delete Goblin Boss?"
        actions={<Button onClick={() => setOpen(false)}>Cancel</Button>}
      >
        <p>This also deletes its 2 photos. This cannot be undone.</p>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('opens with its title and body, closes on Esc and returns focus', async () => {
    render(<DeleteDialogDemo />)
    const trigger = screen.getByRole('button', { name: 'Delete' })
    await userEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Delete Goblin Boss?' })
    expect(dialog).toHaveAccessibleDescription('This also deletes its 2 photos. This cannot be undone.')
    pressEscape(dialog)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('ignores Esc while saving', async () => {
    render(<DeleteDialogDemo busy />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    pressEscape(screen.getByRole('dialog'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
