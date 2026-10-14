import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StackedRow } from './StackedRow'

describe('StackedRow', () => {
  it('shows the heading, its meta and the actions', () => {
    render(<StackedRow heading="ana@example.com" metaText="Member" actions={<button type="button">Resend</button>} />)

    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('Member')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend' })).toBeInTheDocument()
  })

  it('leaves out the meta and the actions when there are none', () => {
    render(<StackedRow heading="ana@example.com" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
