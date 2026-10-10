import type { ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { CheckMark } from './CheckMark'

// CheckboxIndicator is the 18 px square: ink fill and a page-coloured check when checked.
// It is also drawn, without an input, inside multi-select options.
export function CheckboxIndicator({ checked }: { checked: boolean }): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={mergeClassNames('grid size-4.5 shrink-0 place-items-center rounded-ds border border-rule-strong', checked ? 'bg-ink text-page' : 'bg-raised')}
    >
      {checked && <CheckMark />}
    </span>
  )
}
