import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { BaseGlyph } from '../BaseGlyph/BaseGlyph'
import { ChallengeRatingStamp } from '../ChallengeRatingStamp/ChallengeRatingStamp'
import type { CatalogItem } from '../internal/CatalogItem'
import { OwnerStamp } from '../OwnerStamp/OwnerStamp'
import { PaintMark } from '../PaintMark/PaintMark'
import { Quantity } from '../Quantity/Quantity'

type CatalogCardProps = {
  item: CatalogItem
}

// CatalogCard is the phone catalog entry: a 72 px thumbnail, the name, then size, CR, paint, owner and quantity.
// The whole card is the link to the details, at least 96 px tall.
export function CatalogCard({ item }: CatalogCardProps): ReactElement {
  return (
    <Link to={`/minis/${item.id}`} className="flex min-h-24 items-center gap-3 border-b border-rule px-4 py-3 text-ink">
      <span className="grid size-18 shrink-0 place-items-center border border-rule-strong">
        <BaseGlyph creatureSize={item.creatureSize} size="placeholder" />
      </span>
      <span className="grid min-w-0 flex-1 gap-2">
        <span className="type-body-strong truncate">{item.name}</span>
        <span className="flex items-center gap-3">
          <BaseGlyph creatureSize={item.creatureSize} />
          <ChallengeRatingStamp challengeRating={item.challengeRating} />
          <PaintMark status={item.paintStatus} showLabel={false} />
          <OwnerStamp initials={item.ownerInitials} isCurrentUser={item.isOwnedByCurrentUser} ownerName={`Owner: ${item.ownerName}`} />
          <span className="ml-auto">
            <Quantity quantity={item.quantity} />
          </span>
        </span>
      </span>
    </Link>
  )
}
