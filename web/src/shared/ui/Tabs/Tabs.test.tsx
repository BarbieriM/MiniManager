import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Tabs } from './Tabs'

describe('Tabs', () => {
  it('marks the current page', () => {
    render(
      <MemoryRouter initialEntries={['/profile/password']}>
        <Tabs label="Account" items={[{ to: '/profile', label: 'Profile' }, { to: '/profile/password', label: 'Password' }]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Password' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current')
  })
})
