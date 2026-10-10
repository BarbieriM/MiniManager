import { useId, useRef, useState, type KeyboardEvent, type ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
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

type SelectProps = {
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  label?: string
}

// How long typed letters keep adding to the same type-ahead search.
const typeAheadWindowMs = 500

// Select picks one value from a list. It follows the WAI-ARIA "select-only combobox" pattern:
// arrows move, Enter or Space picks, Esc closes, and typing letters jumps to a matching option.
export function Select({ options, value, onChange, placeholder = 'Choose', disabled, invalid, label }: SelectProps): ReactElement {
  const field = useField()
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const typeAheadSearch = useRef({ text: '', typedAt: 0 })
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const isInvalid = invalid ?? field?.invalid ?? false
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = options[selectedIndex]
  useCloseOnOutsideClick(containerRef, open, () => setOpen(false))

  function openList(): void {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function selectOptionAt(optionIndex: number): void {
    const option = options[optionIndex]
    if (option) onChange(option.value)
    setOpen(false)
  }

  // jumpToTypedOption moves to the first option starting with what was typed in the last half second.
  // With the list closed it also selects that option, like a native <select>.
  function jumpToTypedOption(typedCharacter: string): void {
    const now = Date.now()
    const previousText = now - typeAheadSearch.current.typedAt < typeAheadWindowMs ? typeAheadSearch.current.text : ''
    const searchText = previousText + typedCharacter.toLowerCase()
    typeAheadSearch.current = { text: searchText, typedAt: now }
    const matchIndex = options.findIndex((option) => option.label.toLowerCase().startsWith(searchText))
    if (matchIndex < 0) return
    setActiveIndex(matchIndex)
    if (!open) onChange(options[matchIndex].value)
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openList()
      } else if (event.key.length === 1) {
        jumpToTypedOption(event.key)
      }
      return
    }
    const nextIndex = nextActiveIndex(event.key, activeIndex, options.length)
    if (nextIndex !== null) {
      event.preventDefault()
      setActiveIndex(nextIndex)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectOptionAt(activeIndex)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Tab') {
      setOpen(false)
    } else if (event.key.length === 1) {
      jumpToTypedOption(event.key)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={field?.id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={field ? `${field.labelId} ${field.id}` : undefined}
        aria-label={field ? undefined : label}
        aria-activedescendant={open && activeIndex >= 0 ? optionElementId(listId, activeIndex) : undefined}
        aria-invalid={isInvalid || undefined}
        aria-describedby={field?.describedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={controlBoxClassName(
          { invalid: isInvalid, disabled },
          'w-full cursor-pointer justify-between text-left focus-visible:outline-none disabled:cursor-not-allowed',
        )}
      >
        <span className={mergeClassNames('truncate', !selectedOption && 'text-ink-2')}>{selectedOption?.label ?? placeholder}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} />
      </button>
      {open && (
        <Popover id={listId} labelledBy={field?.labelId} label={field ? undefined : label}>
          {options.map((option, optionIndex) => (
            <OptionRow
              key={option.value}
              id={optionElementId(listId, optionIndex)}
              isActive={optionIndex === activeIndex}
              isSelected={optionIndex === selectedIndex}
              onSelect={() => selectOptionAt(optionIndex)}
              onHover={() => setActiveIndex(optionIndex)}
            >
              <span>{option.label}</span>
              <OptionCount count={option.count} />
              {optionIndex === selectedIndex && <Icon name="check" className={option.count === undefined ? 'ml-auto' : undefined} />}
            </OptionRow>
          ))}
        </Popover>
      )}
    </div>
  )
}
