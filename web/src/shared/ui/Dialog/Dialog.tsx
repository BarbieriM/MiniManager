import { useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  // actions are the buttons, right-aligned. The dialog owns the screen's only vermilion element.
  actions: ReactNode
  // isSaving blocks Esc while the dialog's action is running.
  isSaving?: boolean
}

// Dialog is a modal built on the native <dialog> element: showModal() makes the page behind it inert,
// keeps Tab inside the dialog and turns Esc into a "cancel" event. There is no scrim: the panel is
// separated by a 1 px ink border and a 16 px mat in the page colour.
export function Dialog({ open, onClose, title, children, actions, isSaving = false }: DialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const focusBeforeOpen = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const bodyId = useId()

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
      aria-describedby={bodyId}
      onCancel={(event) => {
        // Esc: the browser would close the dialog itself; let React state decide instead.
        event.preventDefault()
        if (!isSaving) onClose()
      }}
      className="m-0 size-full max-h-none max-w-none bg-transparent p-6 text-ink backdrop:bg-transparent open:grid open:place-items-center"
    >
      <div className="grid w-full max-w-110 gap-4 border border-rule-strong bg-raised p-6 outline-16 outline-page">
        <h2 id={titleId} className="type-title">
          {title}
        </h2>
        <div id={bodyId} className="type-body grid gap-4">
          {children}
        </div>
        <div className="flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </dialog>
  )
}
