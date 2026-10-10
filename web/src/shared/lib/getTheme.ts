export type Theme = 'paper' | 'lantern'

// getTheme reads the theme set on <html> by the script in index.html.
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'lantern' ? 'lantern' : 'paper'
}
