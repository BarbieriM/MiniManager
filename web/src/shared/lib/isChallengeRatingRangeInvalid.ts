export type ChallengeRatingRangeValue = { min: number | null; max: number | null }

export const challengeRatingRangeError = 'Minimum CR cannot be higher than maximum CR.'

// isChallengeRatingRangeInvalid is Card 6 rule 5: crMin must be less than or equal to crMax.
export function isChallengeRatingRangeInvalid({ min, max }: ChallengeRatingRangeValue): boolean {
  return min !== null && max !== null && min > max
}
