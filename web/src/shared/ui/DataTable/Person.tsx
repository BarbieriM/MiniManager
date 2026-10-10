import type { ReactElement } from 'react'
import { OwnerStamp } from '../OwnerStamp/OwnerStamp'

export type PersonProps = {
  initials: string
  name: string
  email?: string
  isCurrentUser?: boolean
}

// Person is the "who" cell: owner stamp, name, and the email in mono.
export function Person({ initials, name, email, isCurrentUser }: PersonProps): ReactElement {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <OwnerStamp initials={initials} isCurrentUser={isCurrentUser} />
      <span className="grid min-w-0">
        <span className="type-body-strong truncate">{name}</span>
        {email && <span className="type-mono truncate text-ink-2">{email}</span>}
      </span>
    </span>
  )
}
