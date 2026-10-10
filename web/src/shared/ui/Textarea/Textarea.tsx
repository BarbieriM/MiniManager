import { useEffect, useRef, useState, type ComponentProps, type ReactElement, type Ref } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { controlBoxClassName } from '../internal/controlBoxClassName'
import { useField } from '../Field/useField'

type TextareaProps = ComponentProps<'textarea'> & {
  // maxLength also shows a "12 / 1000" counter under the box.
  maxLength?: number
  invalid?: boolean
}

// assignRef hands the element to a ref the caller passed, whether it is a callback ref or a ref object.
function assignRef<T>(ref: Ref<T> | undefined, element: T | null): void {
  if (typeof ref === 'function') ref(element)
  else if (ref) ref.current = element
}

// Textarea is a multi-line input with an optional character counter.
export function Textarea({ maxLength, invalid, id, className, disabled, readOnly, onChange, ref, ...props }: TextareaProps): ReactElement {
  const field = useField()
  const isInvalid = invalid ?? field?.invalid ?? false
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [characterCount, setCharacterCount] = useState(0)
  const counterId = maxLength ? `${id ?? field?.id ?? 'textarea'}-count` : undefined

  // React Hook Form fills uncontrolled fields after mount, so read the length from the element.
  useEffect(() => {
    setCharacterCount(textareaRef.current?.value.length ?? 0)
  }, [props.value, props.defaultValue])

  return (
    <div className="grid gap-2">
      <div className={controlBoxClassName({ invalid: isInvalid, disabled, readOnly }, mergeClassNames('items-start', className))}>
        <textarea
          ref={(element) => {
            textareaRef.current = element
            assignRef(ref, element)
          }}
          id={id ?? field?.id}
          maxLength={maxLength}
          aria-invalid={isInvalid || undefined}
          aria-describedby={[field?.describedBy, counterId].filter(Boolean).join(' ') || undefined}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => {
            setCharacterCount(event.target.value.length)
            onChange?.(event)
          }}
          className="min-h-24 w-full min-w-0 flex-1 resize-y bg-transparent py-2.5 text-inherit outline-none placeholder:text-ink-2"
          {...props}
        />
      </div>
      {maxLength && (
        <p id={counterId} className="type-mono text-right text-ink-2">
          {characterCount} / {maxLength}
        </p>
      )}
    </div>
  )
}
