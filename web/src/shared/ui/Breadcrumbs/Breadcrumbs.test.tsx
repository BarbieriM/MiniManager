import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAtPath } from '../../../test/renderAtPath'
import { Breadcrumbs } from './Breadcrumbs'

describe('Breadcrumbs', () => {
  it('links every crumb except the current page', () => {
    renderAtPath('/', <Breadcrumbs items={[{ label: 'Members', to: '/admin/members' }, { label: 'Invite person' }]} />)
    expect(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Invite person' })).not.toBeInTheDocument()
    expect(screen.getByText('Invite person')).toHaveAttribute('aria-current', 'page')
  })
})
