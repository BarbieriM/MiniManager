import type { Miniature } from './Miniature'

// MiniaturePage is one page of the Catalog (Card 5 rule 10). total counts the minis matching the filters;
// catalogTotal counts them all (Card 6 rule 7).
export type MiniaturePage = { items: Miniature[]; total: number; page: number; pageSize: number; catalogTotal: number }
