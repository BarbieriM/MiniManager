import { describe, expect, it } from 'vitest'
import { isChallengeRatingRangeInvalid } from './isChallengeRatingRangeInvalid'

describe('isChallengeRatingRangeInvalid', () => {
  it('card 6 rule 5: minimum CR above maximum CR is invalid', () => {
    expect(isChallengeRatingRangeInvalid({ min: 5, max: 1 })).toBe(true)
  })

  it('card 6 rule 5: equal, ordered or open-ended ranges are valid', () => {
    expect(isChallengeRatingRangeInvalid({ min: 1, max: 1 })).toBe(false)
    expect(isChallengeRatingRangeInvalid({ min: 0.25, max: 3 })).toBe(false)
    expect(isChallengeRatingRangeInvalid({ min: 5, max: null })).toBe(false)
    expect(isChallengeRatingRangeInvalid({ min: null, max: null })).toBe(false)
  })
})
