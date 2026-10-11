// filterDefinitionsFor builds the GET /filters body for tests: the seven Card 6 filters with a few options.
export function filterDefinitionsFor(owners: { id: string; displayName: string; count: number }[] = []): unknown[] {
  return [
    { key: 'q', label: 'Search', control: 'search', parameters: ['q'] },
    {
      key: 'creatureType',
      label: 'Type',
      control: 'multiSelect',
      parameters: ['creatureType'],
      options: [
        { value: 'giant', label: 'Giant', count: 1 },
        { value: 'humanoid', label: 'Humanoid', count: 2 },
      ],
    },
    {
      key: 'size',
      label: 'Size',
      control: 'multiSelect',
      parameters: ['size'],
      options: [
        { value: 'small', label: 'Small', count: 1 },
        { value: 'medium', label: 'Medium', count: 1 },
        { value: 'large', label: 'Large', count: 1 },
      ],
    },
    { key: 'challengeRating', label: 'Challenge Rating', control: 'challengeRatingRange', parameters: ['crMin', 'crMax'] },
    {
      key: 'owner',
      label: 'Owner',
      control: 'multiSelect',
      parameters: ['owner'],
      options: owners.map((owner) => ({ value: owner.id, label: owner.displayName, count: owner.count })),
    },
    {
      key: 'paintStatus',
      label: 'Paint status',
      control: 'multiSelect',
      parameters: ['paintStatus'],
      options: [{ value: 'unpainted', label: 'Unpainted', count: 3 }],
    },
    {
      key: 'tags',
      label: 'Tags',
      control: 'tags',
      parameters: ['tags', 'tagMatch'],
      options: [{ value: 'goblinoid', label: 'goblinoid', count: 2 }],
    },
  ]
}
