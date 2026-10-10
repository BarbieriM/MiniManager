import { normalizeTag } from './normalizeTag'

// Tag rules from Card 5 rule 3. The API enforces the same rules; this copy gives instant feedback in the form.

export const maxTags = 20
export const maxTagLength = 30

const word = '[a-z0-9]+(?:[-_][a-z0-9]+)*'
const tagPattern = new RegExp(`^${word}(?::${word})?$`)

export type AddTagResult = { ok: true; tags: string[] } | { ok: false; message: string }

// addTag returns the new tag list, or the message to show when the tag cannot be added.
export function addTag(currentTags: string[], typedTag: string): AddTagResult {
  const tag = normalizeTag(typedTag)
  if (tag.length < 1 || tag.length > maxTagLength) {
    return { ok: false, message: `A tag must be 1 to ${maxTagLength} characters.` }
  }
  if (!tagPattern.test(tag)) {
    return { ok: false, message: 'Use letters, numbers, - or _ in tags, with an optional namespace like faction:drow.' }
  }
  if (currentTags.includes(tag)) return { ok: true, tags: currentTags }
  if (currentTags.length >= maxTags) {
    return { ok: false, message: `A miniature can have at most ${maxTags} tags.` }
  }
  return { ok: true, tags: [...currentTags, tag] }
}
