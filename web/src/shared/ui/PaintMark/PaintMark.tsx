import type { ReactElement } from 'react'
import { paintStatusLabels, type PaintStatus } from '../../lib/paintStatuses'
import { Tooltip } from '../Tooltip/Tooltip'

type PaintMarkProps = {
  status: PaintStatus
  showLabel?: boolean
}

const markColorByStatus: Record<PaintStatus, string> = {
  hand_painted: 'text-hand-painted',
  pre_painted: 'text-pre-painted',
  not_painted: 'text-not-painted',
}

// The mark is drawn in SVG: filled, half-filled or an empty outline, so the status is not colour alone.
function PaintStatusMark({ status }: { status: PaintStatus }): ReactElement {
  return (
    <svg viewBox="0 0 10 10" className={`size-2.5 shrink-0 ${markColorByStatus[status]}`} aria-hidden="true">
      {status === 'hand_painted' && <circle cx="5" cy="5" r="5" fill="currentColor" />}
      {status === 'pre_painted' && <path d="M5 0A5 5 0 0 0 5 10Z" fill="currentColor" />}
      <circle cx="5" cy="5" r="4.5" fill="none" stroke="currentColor" />
    </svg>
  )
}

// PaintMark shows a paint status as a 10 px mark, with a text label or a tooltip.
export function PaintMark({ status, showLabel = true }: PaintMarkProps): ReactElement {
  const label = paintStatusLabels[status]
  if (!showLabel) {
    return (
      <Tooltip label={label}>
        <span role="img" aria-label={label} className="inline-flex">
          <PaintStatusMark status={status} />
        </span>
      </Tooltip>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <PaintStatusMark status={status} />
      <span className="type-dense">{label}</span>
    </span>
  )
}
