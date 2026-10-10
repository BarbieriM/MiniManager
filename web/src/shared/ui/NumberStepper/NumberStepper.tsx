import type { ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { Icon } from '../Icon/Icon'
import { useField } from '../Field/useField'

type NumberStepperProps = {
  // value is the raw text, so a typed "2.5" stays visible until the form shows its error.
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  disabled?: boolean
  invalid?: boolean
  label?: string
}

const stepButtonClassName =
  'grid w-11 cursor-pointer place-items-center hover:bg-sunken active:bg-ink active:text-page disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ink-2'

// NumberStepper is a whole-number input with minus and plus buttons (quantity is 1 to 999).
export function NumberStepper({ value, onChange, min = 1, max = 999, disabled, invalid, label }: NumberStepperProps): ReactElement {
  const field = useField()
  const isInvalid = invalid ?? field?.invalid ?? false
  const parsedNumber = Number.parseInt(value, 10)
  const currentNumber = Number.isNaN(parsedNumber) ? null : parsedNumber

  function stepBy(delta: number): void {
    const startValue = currentNumber ?? (delta > 0 ? min - 1 : min)
    onChange(String(Math.min(max, Math.max(min, startValue + delta))))
  }

  return (
    <div
      className={mergeClassNames(
        'inline-flex h-11 w-fit rounded-ds border bg-raised',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-rule-strong',
        isInvalid ? 'border-accent' : 'border-rule-strong',
        disabled && 'border-rule bg-sunken text-ink-2',
      )}
    >
      <button type="button" aria-label="Decrease" className={stepButtonClassName} disabled={disabled || (currentNumber !== null && currentNumber <= min)} onClick={() => stepBy(-1)}>
        <Icon name="minus" />
      </button>
      <input
        id={field?.id}
        aria-label={field ? undefined : (label ?? 'Quantity')}
        aria-invalid={isInvalid || undefined}
        aria-describedby={field?.describedBy}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={mergeClassNames('type-mono w-18 border-x bg-transparent text-center outline-none', disabled ? 'border-rule' : 'border-rule-strong')}
      />
      <button type="button" aria-label="Increase" className={stepButtonClassName} disabled={disabled || (currentNumber !== null && currentNumber >= max)} onClick={() => stepBy(1)}>
        <Icon name="plus" />
      </button>
    </div>
  )
}
