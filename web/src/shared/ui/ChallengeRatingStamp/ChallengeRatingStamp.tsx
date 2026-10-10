import type { ReactElement } from 'react'
import { formatChallengeRating } from '../../lib/formatChallengeRating'

type ChallengeRatingStampProps = {
  challengeRating: number | null
}

// ChallengeRatingStamp shows a challenge rating in a ruled box, like a stat-block line.
export function ChallengeRatingStamp({ challengeRating }: ChallengeRatingStampProps): ReactElement {
  return (
    <span className="type-mono inline-flex h-5 items-center whitespace-nowrap border border-rule-strong px-2 text-ink">
      {formatChallengeRating(challengeRating)}
    </span>
  )
}
