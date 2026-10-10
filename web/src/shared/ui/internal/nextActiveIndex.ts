// nextActiveIndex returns the option to highlight after an arrow, Home or End key, or null for any other key.
// activeIndex is -1 when nothing is highlighted yet.
export function nextActiveIndex(key: string, activeIndex: number, optionCount: number): number | null {
  if (optionCount === 0) return null
  switch (key) {
    case 'ArrowDown':
      return activeIndex < 0 ? 0 : Math.min(activeIndex + 1, optionCount - 1)
    case 'ArrowUp':
      return activeIndex < 0 ? optionCount - 1 : Math.max(activeIndex - 1, 0)
    case 'Home':
      return 0
    case 'End':
      return optionCount - 1
    default:
      return null
  }
}
