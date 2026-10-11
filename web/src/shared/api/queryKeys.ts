// queryKeys names every cached API query, so a change in one feature can refresh another's data.
// Invalidating queryKeys.miniatures.all refreshes every Catalog page and Miniature.
export const queryKeys = {
  miniatures: {
    all: ['miniatures'] as const,
    // list holds one Catalog page; listQuery is the URL query (filters, sort, page), so each state is cached apart.
    list: (listQuery: string) => ['miniatures', 'list', listQuery] as const,
    detail: (id: string) => ['miniatures', 'detail', id] as const,
  },
  ownerOptions: ['users', 'options'] as const,
  filterDefinitions: ['filters'] as const,
  tagsInUse: ['tags'] as const,
}
