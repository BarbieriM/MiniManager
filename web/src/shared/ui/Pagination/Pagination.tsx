import { useState, type ReactElement } from 'react'
import { IconButton } from '../IconButton/IconButton'

type PaginationProps = {
  // page is 1-based.
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

// Pagination shows "1–24 of 312", previous and next, and a page number to jump to.
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps): ReactElement {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastShown = Math.min(page * pageSize, total)
  // draft holds what is typed in the page box until Enter or leaving the box. It remembers the page it was
  // typed on, so when the page changes from outside (Next, a filter) the box shows the new page.
  const [draft, setDraft] = useState({ page, text: String(page) })
  const typedText = draft.page === page ? draft.text : String(page)

  function commitTypedPage(): void {
    const typedPage = Number.parseInt(typedText, 10)
    if (Number.isNaN(typedPage)) {
      setDraft({ page, text: String(page) })
      return
    }
    const nextPage = Math.min(pageCount, Math.max(1, typedPage))
    setDraft({ page: nextPage, text: String(nextPage) })
    if (nextPage !== page) onPageChange(nextPage)
  }

  return (
    <nav aria-label="Pages" className="flex min-h-14 flex-wrap items-center gap-4">
      <span className="type-mono" aria-live="polite">
        {firstShown}–{lastShown} of {total}
      </span>
      <span className="flex-1" />
      <IconButton icon="chevron-left" label="Previous page" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
      <IconButton icon="chevron-right" label="Next page" variant="outline" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} />
      {pageCount > 1 && (
        <label className="flex items-center gap-2">
          <span className="type-dense text-ink-2">Page</span>
          <input
            inputMode="numeric"
            aria-label="Page number"
            value={typedText}
            onChange={(event) => setDraft({ page, text: event.target.value })}
            onBlur={commitTypedPage}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitTypedPage()
            }}
            className="type-mono h-11 w-14 rounded-ds border border-rule-strong bg-raised text-center"
          />
          <span className="type-mono">of {pageCount}</span>
        </label>
      )}
    </nav>
  )
}
