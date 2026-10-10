import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { controlBoxClassName } from '../internal/controlBoxClassName'
import { controlInputClassName } from '../internal/controlInputClassName'
import { useField } from '../Field/useField'

type TextInputProps = ComponentProps<'input'> & {
  // trailingContent sits inside the box after the input, e.g. a show-password button.
  trailingContent?: ReactNode
  // leadingContent sits before the input, e.g. the search icon.
  leadingContent?: ReactNode
  invalid?: boolean
}

// TextInput is a single-line input. Inside a Field it picks up the label, help and error ids,
// so it works directly with React Hook Form's register().
export function TextInput({ trailingContent, leadingContent, invalid, id, className, disabled, readOnly, ...props }: TextInputProps): ReactElement {
  const field = useField()
  const isInvalid = invalid ?? field?.invalid ?? false
  return (
    <div className={controlBoxClassName({ invalid: isInvalid, disabled, readOnly }, className)}>
      {leadingContent}
      <input
        id={id ?? field?.id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={field?.describedBy}
        disabled={disabled}
        readOnly={readOnly}
        className={controlInputClassName}
        {...props}
      />
      {trailingContent}
    </div>
  )
}
