import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon } from '../Icon/Icon'

type RowLinkItem = { label: string; destructive?: boolean } & ({ to: string } | { onClick: () => void })

// RowLinkList is the phone list of sibling pages and actions on Profile (Change password, Members, Log out):
// 48 px rows, a hairline between, a chevron on the right.
export function RowLinkList({ items }: { items: RowLinkItem[] }): ReactElement {
  const rowClassName = (destructive?: boolean): string =>
    mergeClassNames('flex min-h-12 w-full cursor-pointer items-center justify-between border-b border-rule text-left', destructive ? 'text-accent' : 'text-ink')
  return (
    <ul className="border-t border-rule-strong">
      {items.map((item) => (
        <li key={item.label}>
          {'to' in item ? (
            <Link to={item.to} className={rowClassName(item.destructive)}>
              {item.label}
              <Icon name="chevron-right" className="text-ink-2" />
            </Link>
          ) : (
            <button type="button" onClick={item.onClick} className={rowClassName(item.destructive)}>
              {item.label}
              <Icon name="chevron-right" className="text-ink-2" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
