import type { ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'

type OwnerStampProps = {
  initials: string
  // isCurrentUser draws the signed-in user's own stamp filled.
  isCurrentUser?: boolean
  size?: 'sm' | 'lg'
  // ownerName is the accessible name, for example "Owner: Rafa Lima".
  ownerName?: string
}

const sizeClassNames = {
  sm: 'size-5 type-stamp',
  lg: 'size-16 type-mono-lg',
}

// OwnerStamp shows the owner's two-letter initials in a ruled square.
export function OwnerStamp({ initials, isCurrentUser = false, size = 'sm', ownerName }: OwnerStampProps): ReactElement {
  return (
    <span
      title={ownerName}
      aria-label={ownerName}
      role={ownerName ? 'img' : undefined}
      className={mergeClassNames(
        'inline-flex shrink-0 items-center justify-center border border-rule-strong',
        sizeClassNames[size],
        isCurrentUser ? 'bg-ink text-page' : 'text-ink',
      )}
    >
      {initials}
    </span>
  )
}
