// MiniatureRequest is the body of POST and PUT /miniatures. ownerId is sent by Admins only; version on updates only.
export type MiniatureRequest = {
  name: string
  creatureType: string
  size: string
  challengeRating: number | null
  quantity: number
  paintStatus: string
  tags: string[]
  storageLocation: string
  manufacturer: string
  notes: string
  ownerId?: string
  version?: number
}
