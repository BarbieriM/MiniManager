import { describe, expect, it } from 'vitest'
import { addTag } from './addTag'

describe('card 5 rule 3: addTag', () => {
  it('accepts snake case, dash case and a namespace', () => {
    for (const tag of ['goblinoid', 'goblin_boss', 'goblin-boss', 'weapon:bow', 'faction:red-wizards']) {
      expect(addTag([], tag)).toEqual({ ok: true, tags: [tag] })
    }
  })

  it('rejects other characters', () => {
    for (const tag of ['gob!in', 'a:b:c', 'ação', '-goblin']) {
      expect(addTag([], tag).ok).toBe(false)
    }
  })

  it('de-duplicates after normalizing', () => {
    expect(addTag(['goblin'], 'Goblin')).toEqual({ ok: true, tags: ['goblin'] })
  })

  it('allows 1 to 30 characters per tag', () => {
    expect(addTag([], '   ').ok).toBe(false)
    expect(addTag([], 'a'.repeat(30)).ok).toBe(true)
    expect(addTag([], 'a'.repeat(31)).ok).toBe(false)
  })

  it('counts characters the way the API does, so 30 emoji get the format message, not the length one', () => {
    expect(addTag([], '🐉'.repeat(30))).toEqual({
      ok: false,
      message: 'Use letters, numbers, - or _ in tags, with an optional namespace like faction:drow.',
    })
  })

  it('allows at most 20 tags', () => {
    const twentyTags = Array.from({ length: 20 }, (_, index) => `tag-${index}`)
    expect(addTag(twentyTags, 'one-more')).toEqual({ ok: false, message: 'A miniature can have at most 20 tags.' })
  })
})
