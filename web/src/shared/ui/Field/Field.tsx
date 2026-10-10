import { useId, type ReactElement, type ReactNode } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { FieldContext } from './FieldContext'
import { FieldError } from './FieldError'

type FieldProps = {
  label: string
  // helpText is a quiet line under the control, e.g. "Only admins can change the owner."
  helpText?: ReactNode
  errorMessage?: string
  className?: string
  children: ReactNode
}

// Field wraps a control with its label, help line and error line.
// The error is an icon plus text, never colour alone.
export function Field({ label, helpText, errorMessage, className, children }: FieldProps): ReactElement {
  const id = useId()
  const labelId = `${id}-label`
  const helpId = helpText ? `${id}-help` : undefined
  const errorId = errorMessage ? `${id}-error` : undefined
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined

  return (
    <FieldContext value={{ id, labelId, describedBy, invalid: Boolean(errorMessage) }}>
      <div className={mergeClassNames('grid min-w-0 grid-cols-1 gap-2', className)}>
        <label id={labelId} htmlFor={id} className="type-label">
          {label}
        </label>
        {children}
        {errorMessage && <FieldError id={errorId}>{errorMessage}</FieldError>}
        {helpText && (
          <p id={helpId} className="type-dense text-ink-2">
            {helpText}
          </p>
        )}
      </div>
    </FieldContext>
  )
}
