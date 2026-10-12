// photoAltText describes one Photo of a Miniature for screen readers: "Photo 2 of Goblin", or "Cover photo of
// Goblin" for the cover shown in lists.
export function photoAltText(miniatureName: string, position: number | 'cover'): string {
  return position === 'cover' ? `Cover photo of ${miniatureName}` : `Photo ${position + 1} of ${miniatureName}`
}
