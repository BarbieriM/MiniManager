// catalogSorts are the Catalog's orders (Card 6, clarified 2026-10-11) as the phone Sort select offers them.
// A leading "-" means descending; "name" is the default.
export const catalogSorts = [
  { value: 'name', label: 'Name, A to Z' },
  { value: '-name', label: 'Name, Z to A' },
  { value: 'challengeRating', label: 'CR, low to high' },
  { value: '-challengeRating', label: 'CR, high to low' },
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: 'size', label: 'Size, small to large' },
  { value: '-size', label: 'Size, large to small' },
]
