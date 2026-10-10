import { useId, useRef, useState, type ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import { photoTypes } from '../../lib/getPhotoError'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'

type FileDropProps = {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

// FileDrop takes photos by drag and drop or a file picker. On phones the picker offers camera or gallery.
export function FileDrop({ onFiles, disabled = false }: FileDropProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDraggingOver(true)
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDraggingOver(false)
        if (!disabled) onFiles(Array.from(event.dataTransfer.files))
      }}
      className={mergeClassNames(
        'grid w-80 max-w-full justify-items-center gap-2 rounded-ds border border-dashed border-rule-strong bg-raised p-6 text-center',
        isDraggingOver && 'border-solid bg-sunken',
      )}
    >
      <Icon name="upload" />
      <span className="type-body-strong">Drop a photo here</span>
      <span id={hintId} className="type-dense text-ink-2">
        JPEG, PNG or WebP, up to 5 MB. 3 photos per miniature.
      </span>
      <Button onClick={() => inputRef.current?.click()} disabled={disabled} aria-describedby={hintId}>
        Choose file
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={photoTypes.join(',')}
        multiple
        hidden
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />
    </div>
  )
}
