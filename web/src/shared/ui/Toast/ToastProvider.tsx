import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { Toast } from './Toast'
import { ToastContext, type ToastKind } from './ToastContext'

type ToastItem = { id: number; kind: ToastKind; message: string }

// A success toast leaves on its own after this long; an error stays until dismissed.
export const successToastDurationMs = 5000

// ToastProvider holds the toasts and draws them bottom-right on desktop and above the
// mobile action bar on phones.
export function ToastProvider({ children }: { children: ReactNode }): ReactElement {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextToastId = useRef(1)
  const dismissTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismissToast = useCallback((toastId: number): void => {
    clearTimeout(dismissTimers.current.get(toastId))
    dismissTimers.current.delete(toastId)
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId))
  }, [])

  const showToast = useCallback(
    (kind: ToastKind, message: string): void => {
      const toastId = nextToastId.current++
      setToasts((currentToasts) => [...currentToasts, { id: toastId, kind, message }])
      if (kind === 'ok') dismissTimers.current.set(toastId, setTimeout(() => dismissToast(toastId), successToastDurationMs))
    },
    [dismissToast],
  )

  useEffect(() => {
    const pendingTimers = dismissTimers.current
    return () => pendingTimers.forEach(clearTimeout)
  }, [])

  const toastApi = useMemo(() => ({ show: showToast }), [showToast])

  return (
    <ToastContext value={toastApi}>
      {children}
      <div className="fixed right-4 bottom-20 left-4 z-30 flex flex-col items-end gap-2 md:bottom-6 md:left-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} kind={toast.kind} message={toast.message} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext>
  )
}
