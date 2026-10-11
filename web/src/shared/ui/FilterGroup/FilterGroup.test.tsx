import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FilterGroup } from './FilterGroup'

describe('FilterGroup', () => {
  it('opens and closes its controls from the heading', async () => {
    render(
      <FilterGroup label="Size">
        <input type="checkbox" aria-label="Small" />
      </FilterGroup>,
    )
    const heading = screen.getByRole('button', { name: 'Size' })

    expect(heading).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('checkbox', { name: 'Small' })).toBeVisible()
    await userEvent.click(heading)

    expect(heading).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('checkbox', { name: 'Small', hidden: true })).not.toBeVisible()
  })
})
