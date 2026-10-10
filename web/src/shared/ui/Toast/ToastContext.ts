import { createContext } from 'react'

export type ToastKind = 'ok' | 'error'

export type ToastApi = {
  show: (kind: ToastKind, message: string) => void
}

// ToastContext carries ToastProvider's show() to useToast.
export const ToastContext = createContext<ToastApi | null>(null)
