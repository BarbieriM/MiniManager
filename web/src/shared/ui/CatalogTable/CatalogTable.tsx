import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { creatureSizeLabels } from '../../lib/creatureSizes'
import { creatureTypeLabels } from '../../lib/creatureTypes'
import { BaseGlyph } from '../BaseGlyph/BaseGlyph'
import { ChallengeRatingStamp } from '../ChallengeRatingStamp/ChallengeRatingStamp'
import { CoverThumbnail } from '../CoverThumbnail/CoverThumbnail'
import { Icon } from '../Icon/Icon'
import type { CatalogItem } from '../internal/CatalogItem'
import { OwnerStamp } from '../OwnerStamp/OwnerStamp'
import { PaintMark } from '../PaintMark/PaintMark'
import { Quantity } from '../Quantity/Quantity'

type CatalogTableProps = {
  items: CatalogItem[]
  // sort is the current sort ("name", or "-name" for descending); onSortChange makes the sortable headers buttons.
  sort?: string
  onSortChange?: (sort: string) => void
}

// The one column template for the catalog table: cover, name, size, type, CR, paint, owner, quantity, location.
const rowClassName =
  'grid grid-cols-[48px_minmax(180px,1fr)_120px_120px_72px_136px_56px_80px_minmax(100px,160px)] items-center gap-3 px-2'

// sortKey names the sort a header applies (Card 6); headers without one are not sortable.
const headers: { label: string; sortKey?: string }[] = [
  { label: '' },
  { label: 'Name', sortKey: 'name' },
  { label: 'Size', sortKey: 'size' },
  { label: 'Type' },
  { label: 'CR', sortKey: 'challengeRating' },
  { label: 'Paint' },
  { label: 'Owner' },
  { label: 'Quantity' },
  { label: 'Location' },
]

// nextSort is the sort a header click asks for: its column ascending, or reversed if it is already the sort.
function nextSort(currentSort: string, sortKey: string): string {
  return currentSort === sortKey ? `-${sortKey}` : sortKey
}

function ariaSort(currentSort: string, sortKey: string | undefined): 'ascending' | 'descending' | undefined {
  if (!sortKey) return undefined
  if (currentSort === sortKey) return 'ascending'
  if (currentSort === `-${sortKey}`) return 'descending'
  return undefined
}

// CatalogTable is the desktop catalog: 44 px ruled rows, an ink rule on top, the name linking to the details.
// Under 1040 px it scrolls sideways instead of squeezing the columns.
export function CatalogTable({ items, sort = 'name', onSortChange }: CatalogTableProps): ReactElement {
  return (
    <div className="overflow-x-auto">
      <div role="table" aria-label="Catalog" className="min-w-260 border-t border-rule-strong">
        <div role="row" className={`${rowClassName} type-label min-h-11 border-b border-rule-strong bg-sunken text-ink-2`}>
          {headers.map((header, columnIndex) => {
            const direction = ariaSort(sort, header.sortKey)
            return (
              <span key={columnIndex} role="columnheader" aria-sort={direction} className={header.label === 'Quantity' ? 'text-right' : undefined}>
                {header.sortKey && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(nextSort(sort, header.sortKey ?? ''))}
                    className="type-label inline-flex min-h-11 cursor-pointer items-center gap-1 text-ink-2 hover:text-ink"
                  >
                    {header.label}
                    {direction && <Icon name={direction === 'ascending' ? 'chevron-up' : 'chevron-down'} size={16} />}
                  </button>
                ) : (
                  header.label
                )}
              </span>
            )
          })}
        </div>
        {items.map((item) => (
          <div key={item.id} role="row" className={`${rowClassName} min-h-11 border-b border-rule hover:bg-sunken`}>
            <span role="cell" className="size-10 border border-rule">
              <CoverThumbnail url={item.coverThumbnailUrl} creatureSize={item.creatureSize} miniatureName={item.name} placeholderSize="icon" />
            </span>
            <span role="cell" className="min-w-0 truncate">
              <Link to={`/minis/${item.id}`} className="type-body-strong text-ink hover:underline">
                {item.name}
              </Link>
            </span>
            <span role="cell" className="type-dense flex items-center gap-2">
              <BaseGlyph creatureSize={item.creatureSize} />
              {creatureSizeLabels[item.creatureSize]}
            </span>
            <span role="cell" className="type-dense">
              {creatureTypeLabels[item.creatureType]}
            </span>
            <span role="cell">
              <ChallengeRatingStamp challengeRating={item.challengeRating} />
            </span>
            <span role="cell" className="type-dense">
              <PaintMark status={item.paintStatus} />
            </span>
            <span role="cell">
              <OwnerStamp initials={item.ownerInitials} isCurrentUser={item.isOwnedByCurrentUser} ownerName={`Owner: ${item.ownerName}`} />
            </span>
            <span role="cell">
              <Quantity quantity={item.quantity} />
            </span>
            <span role="cell" className="type-dense min-w-0 truncate text-ink-2">
              {item.storageLocation}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
