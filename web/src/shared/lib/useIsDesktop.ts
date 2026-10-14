import { useSyncExternalStore } from 'react'

// desktopQuery matches the md breakpoint, where the layout switches from phone to desktop (docs/context.md).
const desktopQuery = '(min-width: 768px)'

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(desktopQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function isDesktopNow(): boolean {
  // Without matchMedia (the test environment), assume a desktop, the layout most screens are written for.
  return typeof window.matchMedia !== 'function' || window.matchMedia(desktopQuery).matches
}

// useIsDesktop reports whether the screen is at least the md breakpoint, and follows it as the window resizes. It
// is for the rare piece that must be a different component on phones, such as a bottom Sheet instead of a Dialog;
// everything else switches with Tailwind's md: classes.
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, isDesktopNow)
}
