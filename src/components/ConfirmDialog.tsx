import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={
              variant === 'danger'
                ? 'btn bg-danger text-white hover:bg-danger/90'
                : 'btn-primary'
            }
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        {variant === 'danger' && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <p className="mt-1.5 text-sm text-ink-soft">{description}</p>
        </div>
      </div>
    </Modal>
  )
}
