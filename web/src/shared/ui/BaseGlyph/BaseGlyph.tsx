import type { ReactElement, ReactNode } from 'react'
import { creatureSizeLabels, type CreatureSize } from '../../lib/creatureSizes'
import { mergeClassNames } from '../../lib/mergeClassNames'

type BaseGlyphProps = {
  creatureSize: CreatureSize
  // size: icon is the 16 px glyph; placeholder is the 64 px version used when there is no photo.
  size?: 'icon' | 'placeholder'
  className?: string
}

const cellsPerSideBySize: Partial<Record<CreatureSize, number>> = { large: 2, huge: 3, gargantuan: 4 }

function footprintShapes(creatureSize: CreatureSize): ReactNode {
  if (creatureSize === 'tiny') {
    return (
      <>
        <rect x=".5" y=".5" width="15" height="15" fill="none" stroke="currentColor" />
        <rect width="8" height="8" fill="currentColor" />
      </>
    )
  }
  if (creatureSize === 'small') {
    return (
      <>
        <rect x=".5" y=".5" width="15" height="15" fill="none" stroke="currentColor" />
        <circle cx="8" cy="8" r="3" fill="currentColor" />
      </>
    )
  }
  if (creatureSize === 'medium') return <rect width="16" height="16" fill="currentColor" />

  // Large and up: an n x n grid of cells with a 1 px gap, filling the 16 px box.
  const cellsPerSide = cellsPerSideBySize[creatureSize] ?? 1
  const cellSize = (16 - (cellsPerSide - 1)) / cellsPerSide
  const cells: ReactNode[] = []
  for (let row = 0; row < cellsPerSide; row++) {
    for (let column = 0; column < cellsPerSide; column++) {
      cells.push(
        <rect key={`${row}-${column}`} x={column * (cellSize + 1)} y={row * (cellSize + 1)} width={cellSize} height={cellSize} fill="currentColor" />,
      )
    }
  }
  return cells
}

// BaseGlyph draws a creature's footprint on the 5 ft grid, scaled into a square.
export function BaseGlyph({ creatureSize, size = 'icon', className }: BaseGlyphProps): ReactElement {
  return (
    <span role="img" aria-label={creatureSizeLabels[creatureSize]} className={mergeClassNames('inline-block shrink-0 align-middle', size === 'placeholder' ? 'size-16' : 'size-4', className)}>
      <svg viewBox="0 0 16 16" className="block size-full" shapeRendering="crispEdges" aria-hidden="true">
        {footprintShapes(creatureSize)}
      </svg>
    </span>
  )
}
