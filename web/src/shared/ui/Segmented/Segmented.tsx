import { useRef, type KeyboardEvent, type ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { useField } from '../Field/useField'

type SegmentedOption<T extends string> = { value: T; label: string }

type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  // fullWidth stretches to the column with equal segments, in a narrower type so "Hand-painted" fits at 390 px.
  fullWidth?: boolean
}

// Segmented is a single choice that is always visible (two or three options, never a dropdown).
// It is a radio group: Tab reaches the selected segment and the arrow keys move the choice.
export function Segmented<T extends string>({ options, value, onChange, label, fullWidth = false }: SegmentedProps<T>): ReactElement {
  const field = useField()
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([])

  function handleArrowKeys(event: KeyboardEvent, segmentIndex: number): void {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const nextIndex = (segmentIndex + step + options.length) % options.length
    onChange(options[nextIndex].value)
    segmentRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={field?.labelId}
      aria-label={field ? undefined : label}
      className={mergeClassNames('rounded-ds border border-rule-strong', fullWidth ? 'flex w-full' : 'inline-flex w-fit')}
    >
      {options.map((option, segmentIndex) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(element) => {
              segmentRefs.current[segmentIndex] = element
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleArrowKeys(event, segmentIndex)}
            className={mergeClassNames(
              'type-body-strong h-11 cursor-pointer whitespace-nowrap px-4',
              segmentIndex > 0 && 'border-l border-rule-strong',
              fullWidth && 'flex-1 px-2 font-stretch-75%',
              selected ? 'bg-ink text-page' : 'hover:bg-sunken',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
