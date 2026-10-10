import type { ReactElement, ReactNode } from 'react'

type DefinitionListProps = {
  items: { label: string; value: ReactNode }[]
}

// DefinitionList is the details page "ledger entry": small-caps label left, value right, a hairline between rows.
export function DefinitionList({ items }: DefinitionListProps): ReactElement {
  return (
    <dl className="border-t border-rule-strong">
      {items.map((item) => (
        <div key={item.label} className="flex min-h-11 items-center gap-4 border-b border-rule py-2.5">
          <dt className="type-label w-34 shrink-0 text-ink-2">{item.label}</dt>
          <dd className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
