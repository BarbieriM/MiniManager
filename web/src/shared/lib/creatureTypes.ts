// Creature types in the order of the Postgres enum creature_type (Card 5).
export const creatureTypes = [
  'aberration',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'plant',
  'undead',
] as const
export type CreatureType = (typeof creatureTypes)[number]

export const creatureTypeLabels: Record<CreatureType, string> = {
  aberration: 'Aberration',
  beast: 'Beast',
  celestial: 'Celestial',
  construct: 'Construct',
  dragon: 'Dragon',
  elemental: 'Elemental',
  fey: 'Fey',
  fiend: 'Fiend',
  giant: 'Giant',
  humanoid: 'Humanoid',
  monstrosity: 'Monstrosity',
  ooze: 'Ooze',
  plant: 'Plant',
  undead: 'Undead',
}
