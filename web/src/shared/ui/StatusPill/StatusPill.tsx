import type { ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon } from '../Icon/Icon'

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

const pillByStatus = {
  pending: { label: 'Pending', icon: 'circle', style: 'border-dashed border-rule-strong' },
  accepted: { label: 'Accepted', icon: 'check', style: 'border-rule-strong' },
  expired: { label: 'Expired', icon: 'clock', style: 'border-ink-2 text-ink-2' },
  cancelled: { label: 'Cancelled', icon: 'close', style: 'border-ink-2 text-ink-2' },
} as const

// StatusPill shows an invite's status: text plus a mark, all in ink, never colour alone.
// It is the only pill in the system.
export function StatusPill({ status }: { status: InviteStatus }): ReactElement {
  const { label, icon, style } = pillByStatus[status]
  return (
    <span className={mergeClassNames('type-label inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-ds border px-2', style)}>
      <Icon name={icon} size={16} className="size-3.5" />
      {label}
    </span>
  )
}
