import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon } from '../Icon/Icon'
import { Wordmark } from '../Wordmark/Wordmark'

type MobileHeaderProps = {
  // backLink turns the header into a back link naming where it goes ("Catalog"); without it the wordmark shows.
  backLink?: { to: string; label: string }
  // action is at most one button on the right.
  action?: ReactNode
  className?: string
}

// MobileHeader is the 56 px phone header with an ink rule below.
export function MobileHeader({ backLink, action, className }: MobileHeaderProps): ReactElement {
  return (
    <header className={mergeClassNames('flex h-14 shrink-0 items-center justify-between gap-2 border-b border-rule-strong bg-page px-4 md:hidden', className)}>
      {backLink ? (
        <Link to={backLink.to} className="type-body-strong -ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-ink">
          <Icon name="chevron-left" />
          {backLink.label}
        </Link>
      ) : (
        <Link to="/" className="inline-flex min-h-11 items-center" aria-label="Mini Manager, catalog">
          <Wordmark />
        </Link>
      )}
      {action}
    </header>
  )
}
