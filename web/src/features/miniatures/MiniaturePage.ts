import type { Miniature } from './Miniature'

// MiniaturePage is one page of the Catalog (Card 5 rule 10).
export type MiniaturePage = { items: Miniature[]; total: number; page: number; pageSize: number }
