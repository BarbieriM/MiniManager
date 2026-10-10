import type { ReactElement, ReactNode } from 'react'
import { Checkbox } from '../Checkbox/Checkbox'
import { useField } from '../Field/useField'
import type { Option } from '../internal/Option'

type CheckboxListOption = Option & {
  // icon sits before the label, e.g. a BaseGlyph in the size filter.
  icon?: ReactNode
}

type CheckboxListProps = {
  options: CheckboxListOption[]
  value: string[]
  onChange: (value: string[]) => void
  label?: string
}

// CheckboxList is a ruled list of checkbox rows with counts in mono, used by multi-value filters.
export function CheckboxList({ options, value, onChange, label }: CheckboxListProps): ReactElement {
  const field = useField()

  function toggleOption(optionValue: string, isChecked: boolean): void {
    onChange(isChecked ? [...value, optionValue] : value.filter((selectedValue) => selectedValue !== optionValue))
  }

  return (
    <div role="group" aria-labelledby={field?.labelId} aria-label={field ? undefined : label} className="border-t border-rule-strong">
      {options.map((option) => (
        <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-rule px-3 hover:bg-sunken">
          <Checkbox checked={value.includes(option.value)} onChange={(event) => toggleOption(option.value, event.target.checked)} />
          {option.icon}
          <span className="type-body">{option.label}</span>
          {option.count !== undefined && <span className="type-mono ml-auto text-ink-2">{option.count}</span>}
        </label>
      ))}
    </div>
  )
}
