// initialsFromDisplayName derives the owner stamp: first letters of the first two words, else the first two letters.
export function initialsFromDisplayName(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? '').slice(0, 2).toUpperCase()
}
