import { useId, useRef, useState, type KeyboardEvent, type ReactElement } from 'react'
import { addTag, maxTags } from '../../lib/addTag'
import { splitTagNamespace } from '../../lib/splitTagNamespace'
import { FieldError } from '../Field/FieldError'
import { useField } from '../Field/useField'
import { controlBoxClassName } from '../internal/controlBoxClassName'
import { nextActiveIndex } from '../internal/nextActiveIndex'
import { optionElementId } from '../internal/optionElementId'
import { OptionRow } from '../internal/OptionRow'
import { Popover } from '../internal/Popover'
import { useCloseOnOutsideClick } from '../internal/useCloseOnOutsideClick'
import { Tag } from '../Tag/Tag'

type TagInputProps = {
  value: string[]
  onChange: (value: string[]) => void
  // tagsInUse are the tags already on any miniature (GET /tags), offered as autocomplete.
  tagsInUse?: string[]
  label?: string
}

// How many autocomplete suggestions the list shows at most.
const maxSuggestions = 8

// TagInput adds tags on Enter or comma, normalized by Card 5 rule 3, with autocomplete from tags in use.
// A tag that breaks the rules is not added; the box shows why.
export function TagInput({ value, onChange, tagsInUse = [], label }: TagInputProps): ReactElement {
  const field = useField()
  const listId = useId()
  const inputId = field?.id ?? `${listId}-input`
  const errorId = `${listId}-error`
  const countId = `${listId}-count`
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  useCloseOnOutsideClick(containerRef, open, () => setOpen(false))

  const normalizedQuery = query.trim().toLowerCase()
  const suggestions =
    normalizedQuery === ''
      ? []
      : tagsInUse.filter((tagInUse) => tagInUse.includes(normalizedQuery) && !value.includes(tagInUse)).slice(0, maxSuggestions)
  const showSuggestions = open && suggestions.length > 0

  function addTypedTag(typedTag: string): void {
    if (typedTag.trim() === '') return
    const result = addTag(value, typedTag)
    if (!result.ok) {
      setErrorMessage(result.message)
      return
    }
    setErrorMessage(null)
    onChange(result.tags)
    setQuery('')
    setActiveIndex(-1)
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const nextIndex = showSuggestions ? nextActiveIndex(event.key, activeIndex, suggestions.length) : null
    if (nextIndex !== null) {
      event.preventDefault()
      setActiveIndex(nextIndex)
    } else if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTypedTag(showSuggestions && activeIndex >= 0 ? suggestions[activeIndex] : query)
    } else if (event.key === 'Escape' && showSuggestions) {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Backspace' && query === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const describedBy = [errorMessage ? errorId : null, field?.describedBy, countId].filter(Boolean).join(' ')

  return (
    <div className="grid gap-2">
      <div ref={containerRef} className="relative">
        <div
          className={controlBoxClassName({ invalid: Boolean(errorMessage) || field?.invalid }, 'flex-wrap py-2')}
          onClick={() => inputRef.current?.focus()}
        >
          {value.map((tag) => (
            <Tag key={tag} tag={tag} onRemove={() => onChange(value.filter((existingTag) => existingTag !== tag))} />
          ))}
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls={listId}
            aria-activedescendant={showSuggestions && activeIndex >= 0 ? optionElementId(listId, activeIndex) : undefined}
            aria-label={field ? undefined : (label ?? 'Add a tag')}
            aria-invalid={Boolean(errorMessage) || undefined}
            aria-describedby={describedBy}
            placeholder="Add a tag"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setErrorMessage(null)
              setActiveIndex(-1)
              setOpen(true)
            }}
            onBlur={() => addTypedTag(query)}
            onKeyDown={handleKeyDown}
            className="type-mono h-7 min-w-20 flex-1 bg-transparent outline-none placeholder:text-ink-2"
          />
        </div>
        {showSuggestions && (
          <Popover id={listId} label="Tags in use">
            {suggestions.map((suggestion, suggestionIndex) => {
              const { namespace, value: tagValue } = splitTagNamespace(suggestion)
              return (
                <OptionRow
                  key={suggestion}
                  id={optionElementId(listId, suggestionIndex)}
                  isActive={suggestionIndex === activeIndex}
                  isSelected={false}
                  onSelect={() => addTypedTag(suggestion)}
                  onHover={() => setActiveIndex(suggestionIndex)}
                >
                  <span className="type-mono">
                    {namespace && <span className="text-ink-2">{namespace}</span>}
                    {tagValue}
                  </span>
                </OptionRow>
              )
            })}
          </Popover>
        )}
      </div>
      {errorMessage && <FieldError id={errorId}>{errorMessage}</FieldError>}
      <p id={countId} className="type-mono text-ink-2">
        {value.length} of {maxTags} tags. namespace:value is optional.
      </p>
    </div>
  )
}
