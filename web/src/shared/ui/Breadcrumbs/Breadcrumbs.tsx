import { Fragment, type ReactElement } from 'react'
import { Link } from 'react-router'

type BreadcrumbsProps = {
  // items run from the top level to the current page; the last one is the current page and not a link.
  items: { label: string; to?: string }[]
}

// Breadcrumbs is desktop-only navigation above the page header.
export function Breadcrumbs({ items }: BreadcrumbsProps): ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 hidden md:block">
      <ol className="flex items-center gap-2 text-ink-2">
        {items.map((crumb, crumbIndex) => {
          const isLast = crumbIndex === items.length - 1
          return (
            <Fragment key={crumb.label}>
              {crumbIndex > 0 && (
                <li aria-hidden="true" className="text-ink-2">
                  /
                </li>
              )}
              <li>
                {isLast || !crumb.to ? (
                  <span aria-current={isLast ? 'page' : undefined} className="font-semibold text-ink">
                    {crumb.label}
                  </span>
                ) : (
                  <Link to={crumb.to} className="underline underline-offset-3 hover:text-ink">
                    {crumb.label}
                  </Link>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
