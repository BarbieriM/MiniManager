import type { ReactElement } from 'react'
import type { CreatureSize } from '../../lib/creatureSizes'
import { photoAltText } from '../../lib/photoAltText'
import { BaseGlyph } from '../BaseGlyph/BaseGlyph'

type CoverThumbnailProps = {
  // url is the cover Photo's thumbnail link; null draws the size placeholder (Card 7 rule 8).
  url: string | null
  creatureSize: CreatureSize
  // miniatureName names the photo for screen readers ("Cover photo of Goblin").
  miniatureName: string
  // placeholderSize is the glyph's size when there is no Photo: icon in table rows, placeholder elsewhere.
  placeholderSize?: 'icon' | 'placeholder'
}

// CoverThumbnail fills its box with a Miniature's cover Photo, or with its size placeholder when it has none.
export function CoverThumbnail({ url, creatureSize, miniatureName, placeholderSize = 'placeholder' }: CoverThumbnailProps): ReactElement {
  if (url) return <img src={url} alt={photoAltText(miniatureName, 'cover')} loading="lazy" className="size-full object-cover" />
  return (
    <span className="grid size-full place-items-center">
      <BaseGlyph creatureSize={creatureSize} size={placeholderSize} />
    </span>
  )
}
