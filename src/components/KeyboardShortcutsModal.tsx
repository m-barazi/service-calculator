import { Keyboard } from 'lucide-react'
import { Modal } from './Modal'

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

interface ShortcutItem {
  keys: string[]
  label: string
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Strg/Cmd', 'K'], label: 'Suche fokussieren' },
  { keys: ['Esc'], label: 'Suche leeren / Modals schließen' },
  { keys: ['Strg/Cmd', 'Backspace'], label: 'Warenkorb leeren' },
  { keys: ['?'], label: 'Diese Hilfe anzeigen' },
]

export function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tastatur-Shortcuts"
      description="Arbeite schneller im Kostenrechner"
      size="md"
      footer={
        <button onClick={onClose} className="btn-secondary">
          Schließen
        </button>
      }
    >
      <div className="space-y-3 py-2">
        {SHORTCUTS.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <span className="text-sm text-ink">{s.label}</span>
            <span className="flex items-center gap-1">
              {s.keys.map((k, ki) => (
                <kbd
                  key={ki}
                  className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-border bg-canvas px-2 py-1 text-xs font-semibold text-ink-soft"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-2xs text-ink-muted">
        <Keyboard className="mr-1 inline h-3 w-3" />
        Tipp: Drücke <kbd className="rounded-md border border-border bg-canvas px-1.5 py-0.5 text-xs font-semibold">?</kbd>{' '}
        jederzeit, um diese Übersicht erneut zu öffnen.
      </p>
    </Modal>
  )
}
