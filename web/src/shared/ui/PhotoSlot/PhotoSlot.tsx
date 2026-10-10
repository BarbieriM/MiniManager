import { useRef, type ReactElement } from 'react'
import { photoTypes } from '../../lib/getPhotoError'
import type { CreatureSize } from '../../lib/creatureSizes'
import { BaseGlyph } from '../BaseGlyph/BaseGlyph'
import { Icon } from '../Icon/Icon'
import { IconButton } from '../IconButton/IconButton'

type PhotoSlotProps =
  | { state: 'empty'; creatureSize: CreatureSize; onFiles: (files: File[]) => void; disabled?: boolean }
  | { state: 'uploading'; creatureSize: CreatureSize; progress: number }
  | { state: 'uploaded'; creatureSize: CreatureSize; imageUrl?: string; alt: string; isCover: boolean; onSetCover?: () => void; onRemove?: () => void }
  | { state: 'error'; message: string }

const toolButtonClassName = 'size-11 -mt-px -ml-px border-rule-strong bg-raised md:size-8'

// PhotoSlot is one of a miniature's three 128 px photo places, in one of four states:
// empty (pick a file), uploading (progress), uploaded (cover badge and tools) or error.
export function PhotoSlot(props: PhotoSlotProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)

  if (props.state === 'empty') {
    return (
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => inputRef.current?.click()}
        className="grid size-32 cursor-pointer content-center justify-items-center gap-2 border border-dashed border-rule-strong bg-raised hover:bg-sunken disabled:cursor-not-allowed"
      >
        <BaseGlyph creatureSize={props.creatureSize} className="size-8 text-ink-2" />
        <span className="type-dense text-ink-2">Add photo</span>
        <input
          ref={inputRef}
          type="file"
          accept={photoTypes.join(',')}
          hidden
          onChange={(event) => {
            props.onFiles(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
      </button>
    )
  }

  if (props.state === 'error') {
    return (
      <div role="alert" className="grid size-32 place-items-center border border-accent bg-raised p-2 text-center text-error">
        <span className="grid justify-items-center gap-1">
          <Icon name="alert" />
          <span className="type-dense">{props.message}</span>
        </span>
      </div>
    )
  }

  if (props.state === 'uploading') {
    const percent = Math.round(props.progress)
    return (
      <div className="relative grid size-32 content-center justify-items-center gap-2 border border-rule-strong bg-sunken">
        <BaseGlyph creatureSize={props.creatureSize} className="size-8 text-ink-2" />
        <span className="type-mono">{percent}%</span>
        <div role="progressbar" aria-label="Uploading photo" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="absolute inset-x-0 bottom-0 h-1 bg-rule">
          <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="relative size-32 border border-rule-strong bg-sunken">
      {props.imageUrl ? (
        <img src={props.imageUrl} alt={props.alt} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center">
          <BaseGlyph creatureSize={props.creatureSize} className="size-8 text-ink-2" />
        </span>
      )}
      {props.isCover && <span className="type-label absolute top-0 left-0 flex h-5 items-center bg-ink px-2 text-page">Cover</span>}
      <div className="absolute right-0 bottom-0 flex">
        {!props.isCover && props.onSetCover && <IconButton icon="star" label="Set as cover" variant="outline" className={toolButtonClassName} onClick={props.onSetCover} />}
        {props.onRemove && <IconButton icon="trash" label="Remove photo" variant="outline" className={toolButtonClassName} onClick={props.onRemove} />}
      </div>
    </div>
  )
}
