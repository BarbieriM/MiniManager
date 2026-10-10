import { mergeClassNames } from '../../lib/mergeClassNames'

type ControlBoxState = {
  invalid?: boolean
  disabled?: boolean
  readOnly?: boolean
}

// controlBoxClassName is the shared look of a text control: raised surface, 1 px ink border, 2 px corners,
// the focus outline on the whole box, an accent border on error and a sunken surface when not editable.
export function controlBoxClassName(state: ControlBoxState, extraClassName?: string): string {
  return mergeClassNames(
    'flex min-h-11 items-center gap-2 rounded-ds border bg-raised px-3',
    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-rule-strong',
    state.invalid ? 'border-accent' : 'border-rule-strong',
    (state.disabled || state.readOnly) && 'border-rule bg-sunken text-ink-2',
    extraClassName,
  )
}
