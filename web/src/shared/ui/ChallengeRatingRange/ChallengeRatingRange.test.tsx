import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WithState } from '../../../test/WithState'
import type { ChallengeRatingRangeValue } from '../../lib/isChallengeRatingRangeInvalid'
import { ChallengeRatingRange } from './ChallengeRatingRange'

describe('ChallengeRatingRange', () => {
  it('card 6 rule 5: minimum above maximum shows the error', async () => {
    render(<WithState<ChallengeRatingRangeValue> initialValue={{ min: null, max: null }}>{(value, setValue) => <ChallengeRatingRange value={value} onChange={setValue} />}</WithState>)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Minimum CR' }), '5')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Maximum CR' }), '1')
    expect(screen.getByText('Minimum CR cannot be higher than maximum CR.')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Maximum CR' }), '5')
    expect(screen.queryByText('Minimum CR cannot be higher than maximum CR.')).not.toBeInTheDocument()
  })

  it('offers the fractional CRs', () => {
    render(<ChallengeRatingRange value={{ min: null, max: null }} onChange={() => {}} />)
    expect(screen.getAllByRole('option', { name: '1/8' })).toHaveLength(2)
  })
})
