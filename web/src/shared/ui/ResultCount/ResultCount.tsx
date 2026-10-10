import type { ReactElement } from 'react'
type ResultCountProps = {
  // matchingCount is how many minis match; catalogTotal, when given and different, is the whole catalog.
  matchingCount: number
  catalogTotal?: number
}

function minisLabel(count: number): string {
  return count === 1 ? 'mini' : 'minis'
}

// ResultCount is the result line above the catalog: "48 minis" or "48 of 312 minis". It is announced politely.
export function ResultCount({ matchingCount, catalogTotal }: ResultCountProps): ReactElement {
  const text =
    catalogTotal !== undefined && catalogTotal !== matchingCount
      ? `${matchingCount} of ${catalogTotal} ${minisLabel(catalogTotal)}`
      : `${matchingCount} ${minisLabel(matchingCount)}`
  return (
    <p className="type-mono-lg" aria-live="polite">
      {text}
    </p>
  )
}
