import type { ReactElement, ReactNode } from 'react'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { Dialog } from '../Dialog/Dialog'
import { Sheet } from '../Sheet/Sheet'

type ModalPanelProps = {
  open: boolean
  onClose: () => void
  title: string
  // actions are the panel's buttons: the Dialog's actions on desktops, the Sheet's footer on phones.
  actions: ReactNode
  // isSaving blocks Esc on desktops while an action runs.
  isSaving?: boolean
  children: ReactNode
}

// ModalPanel is a Dialog on desktops and a bottom Sheet on phones, where a centred dialog leaves little room for
// the keyboard (step 6). Its content is a single column that can shrink, so a long link truncates instead of
// widening the panel.
export function ModalPanel({ open, onClose, title, actions, isSaving, children }: ModalPanelProps): ReactElement {
  const isDesktop = useIsDesktop()
  if (isDesktop) {
    return (
      <Dialog open={open} onClose={onClose} title={title} isSaving={isSaving} actions={actions}>
        {children}
      </Dialog>
    )
  }
  return (
    <Sheet open={open} onClose={onClose} title={title} footer={<div className="flex justify-end gap-2">{actions}</div>}>
      <div className="grid grid-cols-1 gap-4 py-4">{children}</div>
    </Sheet>
  )
}
