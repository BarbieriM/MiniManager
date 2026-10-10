import type { ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { splitTagNamespace } from '../../lib/splitTagNamespace'
import { Icon } from '../Icon/Icon'

type TagProps = {
  tag: string
  // onRemove adds a remove button; without it the tag is read-only.
  onRemove?: () => void
}

// Tag shows one tag in mono, with its namespace ("faction:") in the secondary ink.
export function Tag({ tag, onRemove }: TagProps): ReactElement {
  const { namespace, value } = splitTagNamespace(tag)
  return (
    <span
      className={mergeClassNames(
        'type-mono inline-flex items-center gap-1 whitespace-nowrap rounded-ds border border-rule-strong bg-page',
        onRemove ? 'h-11 pl-2 md:h-7 md:pr-1' : 'h-7 px-2',
      )}
    >
      {namespace && <span className="text-ink-2">{namespace}</span>}
      <span>{value}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${tag}`}
          onClick={onRemove}
          className="grid size-11 cursor-pointer place-items-center hover:text-accent md:size-5"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </span>
  )
}
