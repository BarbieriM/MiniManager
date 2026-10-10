import { describe, expect, it } from 'vitest'
import { splitTagNamespace } from './splitTagNamespace'

describe('splitTagNamespace', () => {
  it('separates the namespace from the value', () => {
    expect(splitTagNamespace('faction:drow')).toEqual({ namespace: 'faction:', value: 'drow' })
    expect(splitTagNamespace('goblinoid')).toEqual({ namespace: null, value: 'goblinoid' })
  })
})
