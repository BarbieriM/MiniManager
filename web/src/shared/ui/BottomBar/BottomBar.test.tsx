import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAtPath } from '../../../test/renderAtPath'
import { BottomBar } from './BottomBar'

describe('BottomBar', () => {
  it('marks the current section', () => {
    renderAtPath('/profile', <BottomBar />)
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Catalog' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Add miniature' })).toHaveAttribute('href', '/minis/new')
  })
})
