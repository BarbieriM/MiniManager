import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModalPanel } from './ModalPanel'

// stubScreenWidth makes matchMedia answer as a screen width pixels wide would.
function stubScreenWidth(width: number): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0) <= width,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

function renderPanel(): void {
  render(
    <ModalPanel open onClose={() => {}} title="Invite someone" actions={<button type="button">Done</button>}>
      <p>Invite sent.</p>
    </ModalPanel>,
  )
}

describe('ModalPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is a bottom sheet with a Close button on a phone', () => {
    stubScreenWidth(390)
    renderPanel()
    const panel = screen.getByRole('dialog', { name: 'Invite someone' })
    expect(within(panel).getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('is a dialog on a desktop', () => {
    stubScreenWidth(1440)
    renderPanel()
    const panel = screen.getByRole('dialog', { name: 'Invite someone' })
    expect(within(panel).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    expect(within(panel).getByText('Invite sent.')).toBeInTheDocument()
  })
})
