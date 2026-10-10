import { useRef, type ComponentProps, type ReactElement } from 'react'
import { Icon } from '../Icon/Icon'
import { IconButton } from '../IconButton/IconButton'
import { TextInput } from '../TextInput/TextInput'

type SearchInputProps = Omit<ComponentProps<typeof TextInput>, 'type' | 'value' | 'onChange' | 'leadingContent' | 'trailingContent'> & {
  value: string
  onValueChange: (value: string) => void
  // label names the search box when it has no Field around it.
  label?: string
}

// SearchInput is a controlled search box with a clear button once it has text.
export function SearchInput({ value, onValueChange, label = 'Search miniatures', ...props }: SearchInputProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <TextInput
      {...props}
      ref={inputRef}
      type="search"
      aria-label={label}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      leadingContent={<Icon name="search" className="text-ink-2" />}
      trailingContent={
        value !== '' && (
          <IconButton
            size="insideField"
            icon="close"
            label="Clear search"
            onClick={() => {
              onValueChange('')
              inputRef.current?.focus()
            }}
          />
        )
      }
    />
  )
}
