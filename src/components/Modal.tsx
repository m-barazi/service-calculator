import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'md' | 'lg' | 'xl'
  footer?: ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'lg',
  footer,
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = orig
    }
  }, [open])

  if (!open) return null

  const sizeCls =
    size === 'md' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-4xl'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in bg-canvas/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={[
          'relative flex w-full flex-col overflow-hidden bg-elevated shadow-elevated',
          'animate-slide-up rounded-t-3xl sm:animate-scale-in sm:rounded-3xl sm:border sm:border-border',
          'max-h-[92vh] sm:max-h-[88vh]',
          sizeCls,
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
            <div>
              {title && (
                <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-ink-muted">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="qty-btn -m-1 shrink-0"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border bg-canvas/40 px-5 py-3 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
