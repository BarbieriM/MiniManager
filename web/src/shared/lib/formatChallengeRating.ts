const fractionByChallengeRating: Record<number, string> = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' }

// formatChallengeRating shows a challenge rating the way a stat block does: "CR 1/4", "CR 5", "CR —".
export function formatChallengeRating(challengeRating: number | null): string {
  if (challengeRating === null) return 'CR —'
  return `CR ${fractionByChallengeRating[challengeRating] ?? String(challengeRating)}`
}
