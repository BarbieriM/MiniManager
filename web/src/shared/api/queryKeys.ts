// queryKeys names every cached API query, so a change in one feature can refresh another's data.
// Invalidating queryKeys.miniatures.all refreshes every Catalog page and Miniature.
export const queryKeys = {
  miniatures: {
    all: ['miniatures'] as const,
    page: (page: number) => ['miniatures', 'page', page] as const,
    detail: (id: string) => ['miniatures', 'detail', id] as const,
  },
  ownerOptions: ['users', 'options'] as const,
}
