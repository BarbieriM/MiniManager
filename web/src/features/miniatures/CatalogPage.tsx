import type { ReactElement } from 'react'
import { EmptyState } from '../../shared/ui'

// CatalogPage is the home screen. In build step 1 it only shows the empty Catalog; listing, filters and adding
// miniatures arrive in steps 2 and 3.
export function CatalogPage(): ReactElement {
  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="type-display-m md:type-display">Catalog</h1>
      <EmptyState title="No miniatures yet">The Catalog is empty. Adding miniatures comes in the next update.</EmptyState>
    </div>
  )
}
