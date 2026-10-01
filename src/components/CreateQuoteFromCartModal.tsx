import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { CustomerSelect } from './CustomerSelect'
import { ProjectSelect } from './ProjectSelect'
import { useApp } from '../hooks/useApp'
import type { Customer, Project } from '../types'

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
  const { createQuoteFromCart } = useApp()
  const navigate = useNavigate()
  const [title, setTitle] = useState(defaultTitle)
  const [customer, setCustomer] = useState<Customer | undefined>(undefined)
  const [project, setProject] = useState<Project | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      const quote = await createQuoteFromCart(
        title.trim(),
        customer?.id,
        project?.id,
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
          <CustomerSelect value={customer} onChange={setCustomer} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
            Projekt (optional)
          </span>
          <ProjectSelect value={project} onChange={setProject} customerId={customer?.id} />
        </label>
      </div>
    </Modal>
  )
}
