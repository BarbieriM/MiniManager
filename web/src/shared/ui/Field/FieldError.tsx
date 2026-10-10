import type { ReactElement, ReactNode } from 'react'
import { Icon } from '../Icon/Icon'

// FieldError is the error line: alert icon plus message. Controls with their own checks use it too.
export function FieldError({ id, children }: { id?: string; children: ReactNode }): ReactElement {
  return (
    <p id={id} className="type-dense flex items-start gap-2 text-error">
      <Icon name="alert" />
      <span>{children}</span>
    </p>
  )
}
