import type { CreatureSize } from '../../../shared/lib/creatureSizes'
import type { CreatureType } from '../../../shared/lib/creatureTypes'
import type { PaintStatus } from '../../../shared/lib/paintStatuses'

// Miniature is one Catalog entry as the API returns it. canChange comes from the server's policy (Card 4 rule 8).
export type Miniature = {
  id: string
  name: string
  owner: { id: string; displayName: string }
  creatureType: CreatureType
  size: CreatureSize
  challengeRating: number | null
  quantity: number
  paintStatus: PaintStatus
  tags: string[]
  storageLocation: string
  manufacturer: string
  notes: string
  version: number
  createdAt: string
  updatedAt: string
  canChange: boolean
}
