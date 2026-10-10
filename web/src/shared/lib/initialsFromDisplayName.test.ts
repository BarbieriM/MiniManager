import { describe, expect, it } from 'vitest'
import { initialsFromDisplayName } from './initialsFromDisplayName'

describe('initialsFromDisplayName', () => {
  it('uses the first letters of the first two words', () => {
    expect(initialsFromDisplayName('Mateus Barbieri')).toBe('MB')
    expect(initialsFromDisplayName('ana maria souza')).toBe('AM')
  })

  it('uses the first two letters of a single word', () => {
    expect(initialsFromDisplayName('Rafa')).toBe('RA')
  })

  it('ignores extra spaces', () => {
    expect(initialsFromDisplayName('  Rafa   Lima ')).toBe('RL')
  })
})
