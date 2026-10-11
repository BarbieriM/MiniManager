import type { ReactElement, ReactNode } from 'react'

type ToolbarProps = {
  search: ReactNode
  // phoneActions are the two buttons phones show beside the search, such as Filters and Sort; desktop has the rail
  // and the table headers instead.
  phoneActions: ReactNode
}

// Toolbar sits above a list: the search, and on phones two actions side by side.
export function Toolbar({ search, phoneActions }: ToolbarProps): ReactElement {
  return (
    <div className="mb-4 grid gap-3 md:flex md:items-center md:gap-4">
      <div className="md:w-80">{search}</div>
      <div className="grid grid-cols-2 gap-3 md:hidden">{phoneActions}</div>
    </div>
  )
}
