import { useEffect, useState } from 'react'
import type { Customer } from '../types'
import { Modal } from './Modal'
import { useApp } from '../hooks/useApp'

interface CustomerFormModalProps {
  open: boolean
  onClose: () => void
  customer?: Customer
  onCreated?: (customer: Customer) => void
}

interface FormState {
  name: string
  email: string
  phone: string
  street: string
  zip: string
  city: string
  country: string
  notes: string
}

const empty: FormState = {
  name: '',
  email: '',
  phone: '',
  street: '',
  zip: '',
  city: '',
  country: '',
  notes: '',
}

function toForm(c: Customer): FormState {
  return {
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    street: c.street ?? '',
    zip: c.zip ?? '',
    city: c.city ?? '',
    country: c.country ?? '',
    notes: c.notes ?? '',
  }
}

export function CustomerFormModal({ open, onClose, customer, onCreated }: CustomerFormModalProps) {
  const { addCustomer, updateCustomer } = useApp()
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(customer ? toForm(customer) : empty)
    setErrors({})
  }, [customer, open])

  const buildPayload = (): Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: form.name.trim(),
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    street: form.street.trim() || undefined,
    zip: form.zip.trim() || undefined,
    city: form.city.trim() || undefined,
    country: form.country.trim() || undefined,
    notes: form.notes.trim() || undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'Name ist erforderlich'

    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      if (customer) {
        await updateCustomer(customer.id, buildPayload())
        onClose()
      } else {
        const created = await addCustomer(buildPayload())
        onClose()
        onCreated?.(created)
      }
    } catch (error) {
      console.error('Failed to save customer:', error)
      setErrors({ submit: 'Speichern fehlgeschlagen. Bitte versuche erneut.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Kunde bearbeiten' : 'Neuer Kunde'}
      description={
        customer
          ? 'Aktualisiere Adress- und Kontaktdaten.'
          : 'Füge einen neuen Kunden mit vollständiger Adresse hinzu.'
      }
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" type="button">
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            type="submit"
            form="customer-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Speichere...' : customer ? 'Speichern' : 'Hinzufügen'}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="grid gap-4">
        {errors.submit && (
          <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
            {errors.submit}
          </div>
        )}

        <Field label="Name" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Firmen- oder Personenname"
            className="input w-full"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-Mail (optional)">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="kunde@beispiel.de"
              className="input w-full"
            />
          </Field>

          <Field label="Telefon (optional)">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+49 123 456789"
              className="input w-full"
            />
          </Field>
        </div>

        <div className="rounded-xl border border-border bg-surface/40 p-4">
          <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-ink-muted">
            Adresse
          </p>
          <div className="grid gap-4">
            <Field label="Straße & Hausnummer (optional)">
              <input
                type="text"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                placeholder="Musterstraße 12"
                className="input w-full"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="PLZ (optional)">
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  placeholder="12345"
                  className="input w-full"
                />
              </Field>

              <Field label="Ort (optional)" className="sm:col-span-2">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Musterstadt"
                  className="input w-full"
                />
              </Field>
            </div>

            <Field label="Land (optional)">
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Deutschland"
                className="input w-full"
              />
            </Field>
          </div>
        </div>

        <Field label="Notizen (intern, optional)">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Zusätzliche Infos zum Kunden"
            rows={3}
            className="input w-full resize-none"
          />
        </Field>
      </form>
    </Modal>
  )
}

function Field({
  label,
  error,
  children,
  className = '',
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-2xs font-medium text-danger">{error}</p>
      )}
    </div>
  )
}
