import { describe, expect, it } from 'vitest'
import { normalizeTag } from './normalizeTag'

describe('card 5 rule 3: normalizeTag', () => {
  it('trims and lower-cases', () => {
    expect(normalizeTag('  Goblinoid ')).toBe('goblinoid')
  })

  it('turns spaces into dashes and drops spaces around the namespace colon', () => {
    expect(normalizeTag('Goblin Boss')).toBe('goblin-boss')
    expect(normalizeTag('Faction: Drow')).toBe('faction:drow')
    expect(normalizeTag('goblin - boss')).toBe('goblin-boss')
  })
})
