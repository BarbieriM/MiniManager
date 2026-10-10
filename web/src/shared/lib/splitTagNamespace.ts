// splitTagNamespace separates an optional namespace ("faction:") from the value, for display.
export function splitTagNamespace(tag: string): { namespace: string | null; value: string } {
  const colonIndex = tag.indexOf(':')
  if (colonIndex === -1) return { namespace: null, value: tag }
  return { namespace: tag.slice(0, colonIndex + 1), value: tag.slice(colonIndex + 1) }
}
