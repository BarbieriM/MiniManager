import type { ReactElement } from 'react'
import { ButtonLink, EmptyState } from '../../../shared/ui'

// MiniatureNotFound is what a stale link to a deleted Miniature shows (Card 5 edge case).
export function MiniatureNotFound(): ReactElement {
  return (
    <div className="px-4 py-6 md:px-6">
      <EmptyState title="Miniature not found" action={<ButtonLink to="/">Back to the Catalog</ButtonLink>}>
        This miniature no longer exists.
      </EmptyState>
    </div>
  )
}
