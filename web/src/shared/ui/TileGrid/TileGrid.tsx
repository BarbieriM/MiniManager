import type { ReactElement, ReactNode } from 'react'

// TileGrid lays GridTiles out in columns that fit the width: three on small desktops, up to five on wide ones.
export function TileGrid({ children }: { children: ReactNode }): ReactElement {
  return <div className="grid grid-cols-3 gap-4 border-t border-rule-strong pt-4 lg:grid-cols-4 xl:grid-cols-5">{children}</div>
}
