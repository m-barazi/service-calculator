import { useContext } from 'react'
import { ToastContext, type ToastType } from '../components/ToastProvider'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return {
    show: (message: string, type: ToastType = 'info', duration?: number) =>
      ctx.add(message, type, duration),
    success: (message: string, duration?: number) =>
      ctx.add(message, 'success', duration),
    error: (message: string, duration?: number) =>
      ctx.add(message, 'error', duration),
    warning: (message: string, duration?: number) =>
      ctx.add(message, 'warning', duration),
    info: (message: string, duration?: number) =>
      ctx.add(message, 'info', duration),
  }
}
