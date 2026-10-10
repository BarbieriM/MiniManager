import { useId, useRef, useState, type KeyboardEvent, type ReactElement } from 'react'
import { CheckboxIndicator } from '../Checkbox/CheckboxIndicator'
import { useField } from '../Field/useField'
import { Icon } from '../Icon/Icon'
import { controlBoxClassName } from '../internal/controlBoxClassName'
import { nextActiveIndex } from '../internal/nextActiveIndex'
import type { Option } from '../internal/Option'
import { OptionCount } from '../internal/OptionCount'
import { optionElementId } from '../internal/optionElementId'
import { OptionRow } from '../internal/OptionRow'
import { Popover } from '../internal/Popover'
import { useCloseOnOutsideClick } from '../internal/useCloseOnOutsideClick'

type MultiComboboxProps = {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  label?: string
}

// MultiCombobox picks several values with typeahead. Selected values show as removable chips in the box.
// Keyboard: type to filter, arrows move, Enter toggles, Backspace on an empty box removes the last chip, Esc closes.
export function MultiCombobox({ options, value, onChange, placeholder = 'Type to filter', label }: MultiComboboxProps): ReactElement {
  const field = useField()
  const listId = useId()
  const inputId = field?.id ?? `${listId}-input`
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  useCloseOnOutsideClick(containerRef, open, () => setOpen(false))

  const normalizedQuery = query.trim().toLowerCase()
  const visibleOptions = options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))

  function labelForValue(selectedValue: string): string {
    return options.find((option) => option.value === selectedValue)?.label ?? selectedValue
  }

  function toggleOption(optionValue: string): void {
    onChange(value.includes(optionValue) ? value.filter((selectedValue) => selectedValue !== optionValue) : [...value, optionValue])
    setQuery('')
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const nextIndex = nextActiveIndex(event.key, activeIndex, visibleOptions.length)
    if (nextIndex !== null && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || open)) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(nextIndex)
    } else if (event.key === 'Enter' && open && visibleOptions[activeIndex]) {
      event.preventDefault()
      toggleOption(visibleOptions[activeIndex].value)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Backspace' && query === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={controlBoxClassName({ invalid: field?.invalid }, 'flex-wrap py-1.5')} onClick={() => inputRef.current?.focus()}>
        {value.map((selectedValue) => (
          <span key={selectedValue} className="type-dense inline-flex h-11 items-center gap-1 rounded-ds border border-rule-strong pl-3 md:h-7 md:pr-1">
            {labelForValue(selectedValue)}
            <button
              type="button"
              aria-label={`Remove ${labelForValue(selectedValue)}`}
              onClick={(event) => {
                event.stopPropagation()
                onChange(value.filter((otherValue) => otherValue !== selectedValue))
              }}
              className="grid size-11 cursor-pointer place-items-center hover:text-accent md:size-5"
            >
              <Icon name="close" size={16} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && activeIndex >= 0 && visibleOptions[activeIndex] ? optionElementId(listId, activeIndex) : undefined}
          aria-label={field ? undefined : label}
          aria-describedby={field?.describedBy}
          placeholder={value.length === 0 ? placeholder : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-8 min-w-16 flex-1 bg-transparent outline-none placeholder:text-ink-2"
        />
      </div>
      {open && (
        <Popover id={listId} multiselectable labelledBy={field?.labelId} label={field ? undefined : label}>
          {visibleOptions.length === 0 && <li className="type-dense flex min-h-11 items-center px-3 text-ink-2">No matches</li>}
          {visibleOptions.map((option, optionIndex) => (
            <OptionRow
              key={option.value}
              id={optionElementId(listId, optionIndex)}
              isActive={optionIndex === activeIndex}
              isSelected={value.includes(option.value)}
              onSelect={() => toggleOption(option.value)}
              onHover={() => setActiveIndex(optionIndex)}
            >
              <CheckboxIndicator checked={value.includes(option.value)} />
              <span>{option.label}</span>
              <OptionCount count={option.count} />
            </OptionRow>
          ))}
        </Popover>
      )}
    </div>
  )
}
