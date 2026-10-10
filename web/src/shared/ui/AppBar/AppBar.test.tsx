import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderAtPath } from '../../../test/renderAtPath'
import { AppBar } from './AppBar'

const mateus = { displayName: 'Mateus', initials: 'MA' }

describe('AppBar', () => {
  it('hides Members from members', () => {
    renderAtPath('/', <AppBar user={mateus} isAdmin={false} onLogout={() => {}} />)
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument()
  })

  it('shows Members to admins', () => {
    renderAtPath('/', <AppBar user={mateus} isAdmin onLogout={() => {}} />)
    expect(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument()
  })

  it('opens the profile menu, closes it on Esc and logs out', async () => {
    const onLogout = vi.fn()
    renderAtPath('/', <AppBar user={mateus} isAdmin={false} onLogout={onLogout} />)
    const menuButton = screen.getByRole('button', { name: /Mateus/ })
    await userEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument()
    expect(menuButton).toHaveFocus()
    await userEvent.click(menuButton)
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(onLogout).toHaveBeenCalledOnce()
  })
})
