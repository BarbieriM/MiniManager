// miniatureFor builds a Miniature as the API returns it; overrides change any field.
export function miniatureFor(name: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `${name.toLowerCase().replaceAll(' ', '-')}-id`,
    name,
    owner: { id: 'ana-id', displayName: 'Ana' },
    creatureType: 'humanoid',
    size: 'small',
    challengeRating: null,
    quantity: 1,
    paintStatus: 'unpainted',
    tags: [],
    storageLocation: '',
    manufacturer: '',
    notes: '',
    version: 1,
    createdAt: '2026-10-11T20:00:00Z',
    updatedAt: '2026-10-11T20:00:00Z',
    canChange: true,
    coverThumbnailUrl: null,
    // Details only: the list leaves these out. Photos are off unless a test turns them on.
    photos: [],
    photosEnabled: false,
    ...overrides,
  }
}
