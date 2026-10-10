import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResultCount } from './ResultCount'

describe('ResultCount', () => {
  it('counts minis, with the catalog total when filtered', () => {
    const { rerender } = render(<ResultCount matchingCount={312} catalogTotal={312} />)
    expect(screen.getByText('312 minis')).toBeInTheDocument()
    rerender(<ResultCount matchingCount={48} catalogTotal={312} />)
    expect(screen.getByText('48 of 312 minis')).toBeInTheDocument()
    rerender(<ResultCount matchingCount={1} />)
    expect(screen.getByText('1 mini')).toBeInTheDocument()
  })
})
