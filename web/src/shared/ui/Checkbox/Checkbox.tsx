import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { CheckMark } from './CheckMark'

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  label?: ReactNode
}

// Checkbox is a native checkbox drawn in the design-system style. With a label it is a 44 px row.
export function Checkbox({ label, className, ...props }: CheckboxProps): ReactElement {
  const box = (
    <span className="relative inline-grid size-4.5 shrink-0 place-items-center">
      <input
        type="checkbox"
        className="peer size-4.5 cursor-pointer appearance-none rounded-ds border border-rule-strong bg-raised checked:bg-ink disabled:cursor-not-allowed disabled:border-rule disabled:bg-sunken"
        {...props}
      />
      <span className="pointer-events-none invisible absolute text-page peer-checked:visible">
        <CheckMark />
      </span>
    </span>
  )
  if (!label) return box
  return <label className={mergeClassNames('flex min-h-11 cursor-pointer items-center gap-3', className)}>{box}{label}</label>
}
