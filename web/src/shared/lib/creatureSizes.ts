// Creature sizes in the order of the Postgres enum creature_size (docs/plan.md), smallest first.
export const creatureSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const
export type CreatureSize = (typeof creatureSizes)[number]

export const creatureSizeLabels: Record<CreatureSize, string> = {
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge',
  gargantuan: 'Gargantuan',
}
