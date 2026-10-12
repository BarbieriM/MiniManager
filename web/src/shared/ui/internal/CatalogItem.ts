import type { CreatureSize } from '../../lib/creatureSizes'
import type { CreatureType } from '../../lib/creatureTypes'
import type { PaintStatus } from '../../lib/paintStatuses'

// CatalogItem is one Miniature as the Catalog table and cards show it.
export type CatalogItem = {
  id: string
  name: string
  creatureSize: CreatureSize
  creatureType: CreatureType
  challengeRating: number | null
  paintStatus: PaintStatus
  quantity: number
  ownerName: string
  ownerInitials: string
  // isOwnedByCurrentUser fills the owner stamp, so your own minis stand out.
  isOwnedByCurrentUser: boolean
  storageLocation: string
  // coverThumbnailUrl is the cover Photo at list size, or null to show the size placeholder (Card 7 rule 8).
  coverThumbnailUrl: string | null
}
