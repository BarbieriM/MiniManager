import { useContext } from 'react'
import { ToastContext, type ToastApi } from './ToastContext'

// useToast returns show(kind, message). It must be called under ToastProvider.
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside ToastProvider')
  return api
}
