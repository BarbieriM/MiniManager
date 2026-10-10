// Skeleton rows are made of rules, not grey blobs. The list says "Loading" to screen readers once.
import type { ReactElement } from 'react'

function SkeletonLine({ className = '' }: { className?: string }): ReactElement {
  return <span className={`block h-px bg-rule-strong ${className}`} />
}

function SkeletonTableRow(): ReactElement {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-rule px-2">
      <span className="size-7 shrink-0 border border-rule" />
      <span className="flex-1">
        <SkeletonLine className="w-3/5" />
      </span>
      <span className="w-28 shrink-0">
        <SkeletonLine />
      </span>
      <span className="w-19 shrink-0">
        <SkeletonLine />
      </span>
      <span className="w-15 shrink-0">
        <SkeletonLine />
      </span>
    </div>
  )
}

function SkeletonCardRow(): ReactElement {
  return (
    <div className="flex min-h-24 items-center gap-3 border-b border-rule px-4 py-3">
      <span className="size-18 shrink-0 border border-rule" />
      <span className="flex flex-1 flex-col gap-4">
        <SkeletonLine className="w-3/5" />
        <SkeletonLine className="w-4/5" />
        <SkeletonLine className="w-2/5" />
      </span>
    </div>
  )
}

type SkeletonProps = {
  // table matches the desktop catalog rows; card matches the mobile catalog cards.
  variant: 'table' | 'card'
  rowCount?: number
}

export function Skeleton({ variant, rowCount = 6 }: SkeletonProps): ReactElement {
  const SkeletonRow = variant === 'table' ? SkeletonTableRow : SkeletonCardRow
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className="border-t border-rule-strong">
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <SkeletonRow key={rowIndex} />
      ))}
    </div>
  )
}
