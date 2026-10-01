import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { useApp } from '../hooks/useApp'

interface CreateQuoteFromCartModalProps {
  open: boolean
  onClose: () => void
  defaultTitle?: string
}

export function CreateQuoteFromCartModal({
  open,
  onClose,
  defaultTitle = 'Angebot',
}: CreateQuoteFromCartModalProps) {
  const { customers, createQuoteFromCart } = useApp()
  const navigate = useNavigate()
  const [title, setTitle] = useState(defaultTitle)
  const [customerId, setCustomerId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      const quote = await createQuoteFromCart(
        title.trim(),
        customerId || undefined,
      )
      onClose()
      navigate(`/angebote?id=${quote.id}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Angebot aus Auswahl erstellen"
      description="Wandle die aktuelle Auswahl im Rechner in ein Angebot um."
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" type="button">
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="btn-primary"
          >
            <FileText className="h-4 w-4" />
            {isSubmitting ? 'Erstelle...' : 'Angebot erstellen'}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
            Titel
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Marketingpaket Q4"
            className="input w-full"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
            Kunde (optional)
          </span>
          <div className="relative">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input w-full appearance-none pr-10"
            >
              <option value="">Kein Kunde / manuell später</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` · ${c.city}` : ''}
                </option>
              ))}
            </select>
            {/* Chevron placeholder — Modal-Select nutzt ChevronDown, hier reicht native Darstellung */}
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </label>
      </div>
    </Modal>
  )
}
