import type { ReactElement, ReactNode } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon } from '../Icon/Icon'

type MessageBoxProps = {
  kind: 'error' | 'ok' | 'info'
  children: ReactNode
}

const styleByKind = {
  error: { icon: 'alert', edge: 'border-l-error', tint: 'text-error' },
  ok: { icon: 'check', edge: 'border-l-success', tint: 'text-success' },
  info: { icon: 'info', edge: 'border-l-ink-2', tint: 'text-ink-2' },
} as const

// MessageBox is one message about a whole form or page (the form-level twin of a field error):
// a 4 px edge in the feedback colour plus an icon, so colour is never the only signal.
export function MessageBox({ kind, children }: MessageBoxProps): ReactElement {
  const { icon, edge, tint } = styleByKind[kind]
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={mergeClassNames('flex items-start gap-3 border border-l-4 border-rule-strong bg-raised px-4 py-3', edge)}>
      <Icon name={icon} className={tint} />
      <div>{children}</div>
    </div>
  )
}
