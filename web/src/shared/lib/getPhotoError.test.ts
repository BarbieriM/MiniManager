import { describe, expect, it } from 'vitest'
import { getPhotoError, maxPhotoBytes } from './getPhotoError'

function jpegFile(sizeInBytes = 1024): { type: string; size: number } {
  return { type: 'image/jpeg', size: sizeInBytes }
}

describe('card 7 photos', () => {
  it('card 7 rule 1: allows at most 3 photos', () => {
    expect(getPhotoError(jpegFile(), 2)).toBeNull()
    expect(getPhotoError(jpegFile(), 3)).toBe('A miniature can have up to 3 photos.')
  })

  it('card 7 rule 2: accepts JPEG, PNG and WebP only', () => {
    expect(getPhotoError({ type: 'image/png', size: 10 }, 0)).toBeNull()
    expect(getPhotoError({ type: 'image/webp', size: 10 }, 0)).toBeNull()
    expect(getPhotoError({ type: 'image/gif', size: 10 }, 0)).toBe('Use a JPEG, PNG or WebP image.')
    expect(getPhotoError({ type: 'image/heic', size: 10 }, 0)).toBe('Use a JPEG, PNG or WebP image.')
  })

  it('card 7 rule 2: accepts files up to 5 MB', () => {
    expect(getPhotoError(jpegFile(maxPhotoBytes), 0)).toBeNull()
    expect(getPhotoError(jpegFile(maxPhotoBytes + 1), 0)).toBe('Images must be 5 MB or smaller.')
  })
})
