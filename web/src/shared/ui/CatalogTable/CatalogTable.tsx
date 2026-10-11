import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { creatureSizeLabels } from '../../lib/creatureSizes'
import { creatureTypeLabels } from '../../lib/creatureTypes'
import { BaseGlyph } from '../BaseGlyph/BaseGlyph'
import { ChallengeRatingStamp } from '../ChallengeRatingStamp/ChallengeRatingStamp'
import type { CatalogItem } from '../internal/CatalogItem'
import { OwnerStamp } from '../OwnerStamp/OwnerStamp'
import { PaintMark } from '../PaintMark/PaintMark'
import { Quantity } from '../Quantity/Quantity'

type CatalogTableProps = {
  items: CatalogItem[]
}

// The one column template for the catalog table: cover, name, size, type, CR, paint, owner, quantity, location.
const rowClassName =
  'grid grid-cols-[48px_minmax(180px,1fr)_120px_120px_72px_136px_56px_80px_minmax(100px,160px)] items-center gap-3 px-2'

const headers = ['', 'Name', 'Size', 'Type', 'CR', 'Paint', 'Owner', 'Quantity', 'Location']

// CatalogTable is the desktop catalog: 44 px ruled rows, an ink rule on top, the name linking to the details.
// Under 1040 px it scrolls sideways instead of squeezing the columns.
export function CatalogTable({ items }: CatalogTableProps): ReactElement {
  return (
    <div className="overflow-x-auto">
      <div role="table" aria-label="Catalog" className="min-w-260 border-t border-rule-strong">
        <div role="row" className={`${rowClassName} type-label min-h-11 border-b border-rule-strong bg-sunken text-ink-2`}>
          {headers.map((header, columnIndex) => (
            <span key={columnIndex} role="columnheader" className={header === 'Quantity' ? 'text-right' : undefined}>
              {header}
            </span>
          ))}
        </div>
        {items.map((item) => (
          <div key={item.id} role="row" className={`${rowClassName} min-h-11 border-b border-rule hover:bg-sunken`}>
            <span role="cell">
              <BaseGlyph creatureSize={item.creatureSize} />
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
