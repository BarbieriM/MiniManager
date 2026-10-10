import type { ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon } from '../Icon/Icon'
import { IconButton } from '../IconButton/IconButton'
import type { ToastKind } from './ToastContext'

type ToastProps = {
  kind: ToastKind
  message: string
  onDismiss: () => void
}

// Toast is one short message: raised, 1 px ink border, a 4 px edge and an icon in the feedback colour.
export function Toast({ kind, message, onDismiss }: ToastProps): ReactElement {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={mergeClassNames(
        'flex min-h-12 w-full items-center gap-3 border border-l-4 border-rule-strong bg-raised pl-4 md:w-90',
        kind === 'ok' ? 'border-l-success' : 'border-l-error',
      )}
    >
      <Icon name={kind === 'ok' ? 'check' : 'alert'} className={kind === 'ok' ? 'text-success' : 'text-error'} />
      <span className="flex-1">{message}</span>
      <IconButton icon="close" label="Dismiss" onClick={onDismiss} />
    </div>
  )
}
