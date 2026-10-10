import { useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react'
import { IconButton } from '../IconButton/IconButton'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  // headerActions sit next to the close button, e.g. "Clear all".
  headerActions?: ReactNode
  // footer is the sticky bottom area, e.g. the "Show 48 minis" button.
  footer?: ReactNode
  children: ReactNode
}

// Sheet is the mobile bottom sheet (filters, actions), on the native <dialog> like Dialog.
// It is separated from the page by its top rule only: no scrim, no shadow.
export function Sheet({ open, onClose, title, headerActions, footer, children }: SheetProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const focusBeforeOpen = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      focusBeforeOpen.current = document.activeElement as HTMLElement | null
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
      focusBeforeOpen.current?.focus()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-0 size-full max-h-none max-w-none bg-transparent pt-12 text-ink backdrop:bg-transparent open:flex open:flex-col open:justify-end"
    >
      <div className="flex max-h-full flex-col border-t border-rule-strong bg-raised">
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 bg-ink" />
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-rule px-4 py-2">
          <h2 id={titleId} className="type-title">
            {title}
          </h2>
          <div className="flex items-center">
            {headerActions}
            <IconButton icon="close" label="Close" onClick={onClose} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-rule-strong bg-raised px-4 py-3">{footer}</div>}
      </div>
    </dialog>
  )
}
