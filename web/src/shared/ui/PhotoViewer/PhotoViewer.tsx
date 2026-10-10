import { useState, type ReactElement } from 'react'
import { mergeClassNames } from '../../lib/mergeClassNames'
import type { CreatureSize } from '../../lib/creatureSizes'
import { BaseGlyph } from '../BaseGlyph/BaseGlyph'

type Photo = { id: string; url?: string; alt: string; isCover: boolean }

type PhotoViewerProps = {
  photos: Photo[]
  // creatureSize draws the placeholder when there is no photo (Card 7 rule 8).
  creatureSize: CreatureSize
}

// PhotoViewer shows one large photo with its cover badge and "1 / 3" count, and a row of 72 px thumbnails.
export function PhotoViewer({ photos, creatureSize }: PhotoViewerProps): ReactElement {
  const [shownIndex, setShownIndex] = useState(0)
  const current = photos[Math.min(shownIndex, photos.length - 1)]

  if (!current) {
    return (
      <div className="grid aspect-square content-center justify-items-center gap-3 border border-rule-strong bg-sunken">
        <BaseGlyph creatureSize={creatureSize} className="size-24 text-ink-2" />
        <span className="text-ink-2">No photo yet</span>
      </div>
    )
  }

  return (
    <div>
      <div className="relative grid aspect-square place-items-center border border-rule-strong bg-sunken">
        {current.url ? (
          <img src={current.url} alt={current.alt} className="size-full object-cover" />
        ) : (
          <BaseGlyph creatureSize={creatureSize} className="size-24 text-ink-2" />
        )}
        {current.isCover && <span className="type-label absolute top-0 left-0 flex h-5 items-center bg-ink px-2 text-page">Cover</span>}
        <span className="type-mono absolute right-2 bottom-2 flex h-6 items-center border border-rule-strong bg-raised px-2" aria-live="polite">
          {shownIndex + 1} / {photos.length}
        </span>
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2">
          {photos.map((photo, photoIndex) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`Show photo ${photoIndex + 1} of ${photos.length}`}
              aria-pressed={photoIndex === shownIndex}
              onClick={() => setShownIndex(photoIndex)}
              className={mergeClassNames('grid size-18 cursor-pointer place-items-center bg-sunken', photoIndex === shownIndex ? 'border-2 border-ink' : 'border border-rule')}
            >
              {photo.url ? <img src={photo.url} alt="" className="size-full object-cover" /> : <BaseGlyph creatureSize={creatureSize} className="size-6 text-ink-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
