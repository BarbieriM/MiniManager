import type { ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'

type WordmarkProps = {
  size?: 'md' | 'lg'
}

// Wordmark is "Mini Manager" with the M drawn on a 2 x 2 base-glyph grid.
export function Wordmark({ size = 'md' }: WordmarkProps): ReactElement {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className={mergeClassNames('shrink-0', size === 'lg' ? 'size-10' : 'size-6')}>
        <rect x=".5" y=".5" width="23" height="23" strokeWidth="1" />
        <path d="M12 .5V23.5M.5 12H23.5" className="stroke-rule" strokeWidth="1" />
        <path d="M5 19.5V4.5L12 13L19 4.5V19.5" strokeWidth="2.5" strokeLinejoin="miter" />
      </svg>
      <span className={size === 'lg' ? 'type-display' : 'type-wordmark'}>Mini Manager</span>
    </span>
  )
}
