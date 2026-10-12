import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { creatureSizeLabels } from '../../lib/creatureSizes'
import { BaseGlyph } from '../BaseGlyph/BaseGlyph'
import { CoverThumbnail } from '../CoverThumbnail/CoverThumbnail'
import type { CatalogItem } from '../internal/CatalogItem'
import { OwnerStamp } from '../OwnerStamp/OwnerStamp'
import { Quantity } from '../Quantity/Quantity'

// GridTile is one Miniature in the desktop photo grid (Card 6, clarified 2026-10-12): the square cover Photo (or
// the size placeholder) with the Owner stamp on it, then the name, the size and the quantity. The whole tile is the
// link to the details.
export function GridTile({ item }: { item: CatalogItem }): ReactElement {
  return (
    <Link to={`/minis/${item.id}`} className="grid border border-rule bg-raised text-ink hover:border-rule-strong">
      <span className="relative aspect-square border-b border-rule bg-sunken">
        <CoverThumbnail url={item.coverThumbnailUrl} creatureSize={item.creatureSize} miniatureName={item.name} />
        <span className="absolute top-2 right-2">
          <OwnerStamp initials={item.ownerInitials} isCurrentUser={item.isOwnedByCurrentUser} ownerName={`Owner: ${item.ownerName}`} />
        </span>
      </span>
      <span className="grid gap-2 p-3">
        <span className="type-body-strong truncate">{item.name}</span>
        <span className="flex items-center gap-2">
          <BaseGlyph creatureSize={item.creatureSize} />
          <span className="type-dense">{creatureSizeLabels[item.creatureSize]}</span>
          <span className="ml-auto">
            <Quantity quantity={item.quantity} />
          </span>
        </span>
      </span>
    </Link>
  )
}
