import { initialsFromDisplayName } from '../../../shared/lib/initialsFromDisplayName'
import type { CatalogItem } from '../../../shared/ui'
import type { Miniature } from '../api/Miniature'

// toCatalogItem turns an API Miniature into what the Catalog table and cards show.
export function toCatalogItem(miniature: Miniature, currentUserId: string): CatalogItem {
  return {
    id: miniature.id,
    name: miniature.name,
    creatureSize: miniature.size,
    creatureType: miniature.creatureType,
    challengeRating: miniature.challengeRating,
    paintStatus: miniature.paintStatus,
    quantity: miniature.quantity,
    ownerName: miniature.owner.displayName,
    ownerInitials: initialsFromDisplayName(miniature.owner.displayName),
    isOwnedByCurrentUser: miniature.owner.id === currentUserId,
    storageLocation: miniature.storageLocation,
  }
}
