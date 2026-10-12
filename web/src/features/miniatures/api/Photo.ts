// Photo is one Photo of a Miniature as the API returns it (Card 7): links to its two sizes, and whether it is the
// cover.
export type Photo = { id: string; thumbnailUrl: string; fullUrl: string; isCover: boolean }
