import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  add: (message: string, type: ToastType, duration?: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 7000,
  warning: 5000,
  info: 4000,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback(
    (message: string, type: ToastType, duration?: number) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const item: ToastItem = { id, message, type }
      setToasts((prev) => [...prev, item])

      const timeout = duration ?? DEFAULT_DURATIONS[type]
      setTimeout(() => remove(id), timeout)
    },
    [remove],
  )

  const value = useMemo(() => ({ add }), [add])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-[88px] left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function Toast({
  toast,
  onRemove,
}: {
  toast: ToastItem
  onRemove: (id: string) => void
}) {
  const Icon = ICONS[toast.type]
  const colors = COLOR_MAP[toast.type]

  return (
    <div
      className={[
        'flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-elevated',
        'animate-slide-up backdrop-blur-xl',
        colors.bg,
        colors.border,
        colors.text,
      ].join(' ')}
      role="status"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} />
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="-mr-1 -mt-1 rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
        aria-label="Benachrichtigung schließen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const COLOR_MAP: Record<
  ToastType,
  { bg: string; border: string; text: string }
> = {
  success: {
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/80',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-100',
  },
  error: {
    bg: 'bg-red-50/90 dark:bg-red-950/80',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-100',
  },
  warning: {
    bg: 'bg-amber-50/90 dark:bg-amber-950/80',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-100',
  },
  info: {
    bg: 'bg-surface/95 dark:bg-surface/95',
    border: 'border-border dark:border-border',
    text: 'text-ink dark:text-ink',
  },
}
