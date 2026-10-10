import { describe, expect, it } from 'vitest'
import { formatChallengeRating } from './formatChallengeRating'

describe('formatChallengeRating', () => {
  it('shows fractional CRs as fractions', () => {
    expect(formatChallengeRating(0.125)).toBe('CR 1/8')
    expect(formatChallengeRating(0.25)).toBe('CR 1/4')
    expect(formatChallengeRating(0.5)).toBe('CR 1/2')
  })

  it('shows whole CRs as numbers', () => {
    expect(formatChallengeRating(0)).toBe('CR 0')
    expect(formatChallengeRating(5)).toBe('CR 5')
    expect(formatChallengeRating(30)).toBe('CR 30')
  })

  it('shows a dash when there is no CR', () => {
    expect(formatChallengeRating(null)).toBe('CR —')
  })
})
