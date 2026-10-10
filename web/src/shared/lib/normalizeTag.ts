// normalizeTag applies Card 5 rule 3 to typed text: trims and lower-cases, drops spaces around the
// namespace colon and turns other spaces into dashes.
export function normalizeTag(typedTag: string): string {
  return typedTag
    .trim()
    .toLowerCase()
    .replace(/\s*:\s*/g, ':')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
}
