import type { Theme } from './getTheme'

// setTheme switches Paper/Lantern now and remembers the choice for the next visit.
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit.
  }
}
