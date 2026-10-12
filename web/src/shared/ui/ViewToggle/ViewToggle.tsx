import type { ReactElement } from 'react'
import { IconButton } from '../IconButton/IconButton'
import type { CatalogView } from './CatalogView'

type ViewToggleProps = {
  value: CatalogView
  onChange: (view: CatalogView) => void
}

// ViewToggle switches the desktop Catalog between the table and the photo grid; the pressed button is the view
// shown.
export function ViewToggle({ value, onChange }: ViewToggleProps): ReactElement {
  return (
    <div role="group" aria-label="View" className="flex">
      <IconButton icon="view-table" label="Table view" variant={value === 'table' ? 'outline' : 'quiet'} aria-pressed={value === 'table'} onClick={() => onChange('table')} />
      <IconButton icon="view-grid" label="Photo grid view" variant={value === 'grid' ? 'outline' : 'quiet'} aria-pressed={value === 'grid'} onClick={() => onChange('grid')} />
    </div>
  )
}
