import { useEffect, useState } from 'react'
import type { Service } from '../types'
import { Modal } from './Modal'
import { useApp } from '../hooks/useApp'

interface FormState {
  name: string
  category: string
  purchasePriceStr: string
  salePriceStr: string
  defaultQuantity: number
  url: string
  note: string
  visible: boolean
}

const empty: FormState = {
  name: '',
  category: '',
  purchasePriceStr: '0',
  salePriceStr: '0',
  defaultQuantity: 1,
  url: '',
  note: '',
  visible: true,
}

export function ServiceFormModal({
  open,
  onClose,
  service,
}: ServiceFormModalProps) {
  const { addService, updateService, categories } = useApp()
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when service or open state changes
  useEffect(() => {
    if (!open) return
    if (service) {
      setForm({
        name: service.name,
        category: service.category,
        purchasePriceStr: service.purchasePrice.toString().replace('.', ','),
        salePriceStr: service.salePrice.toString().replace('.', ','),
        defaultQuantity: service.defaultQuantity,
        url: service.url ?? '',
        note: service.note ?? '',
        visible: service.visible,
      })
    } else {
      setForm(empty)
    }
    setErrors({})
  }, [service, open])

  const parsePrice = (s: string): number | null => {
    const cleaned = s.replace(/\./g, '').replace(',', '.').trim()
    if (cleaned === '') return 0
    const n = parseFloat(cleaned)
    return isNaN(n) || n < 0 ? null : n
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!form.name.trim()) newErrors.name = 'Name ist erforderlich'
    if (!form.category.trim()) newErrors.category = 'Kategorie ist erforderlich'

    const purchase = parsePrice(form.purchasePriceStr)
    if (purchase === null) newErrors.purchasePriceStr = 'Ungültiger Preis'
    const sale = parsePrice(form.salePriceStr)
    if (sale === null) newErrors.salePriceStr = 'Ungültiger Preis'

    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      purchasePrice: purchase ?? 0,
      salePrice: sale ?? 0,
      defaultQuantity: Math.max(1, form.defaultQuantity),
      url: form.url.trim() || undefined,
      note: form.note.trim() || undefined,
      visible: form.visible,
    }

    setIsSubmitting(true)
    try {
      if (service) {
        await updateService(service.id, payload)
      } else {
        await addService(payload)
      }
      onClose()
    } catch (error) {
      console.error('Failed to save service:', error)
      setErrors({ submit: 'Speichern fehlgeschlagen. Bitte versuche erneut.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? 'Leistung bearbeiten' : 'Neue Leistung'}
      description={
        service
          ? 'Aktualisiere Preise und Details.'
          : 'Füge eine neue Dienstleistung zur Preisliste hinzu.'
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
            form="service-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Speichere...' : service ? 'Speichern' : 'Hinzufügen'}
          </button>
        </>
      }
    >
      <form id="service-form" onSubmit={handleSubmit} className="grid gap-4">
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
            placeholder="z.B. Visitenkarten Premium"
            className="input w-full"
            autoFocus
          />
        </Field>

        <Field label="Kategorie" error={errors.category}>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="z.B. Print & Marketing"
            list="categories-list"
            className="input w-full"
          />
          <datalist id="categories-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Einkaufspreis (Netto)"
            error={errors.purchasePriceStr}
            hint="Was du für eine Einheit zahlst"
          >
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={form.purchasePriceStr}
                onChange={(e) =>
                  setForm({ ...form, purchasePriceStr: e.target.value })
                }
                placeholder="0,00"
                className="input w-full pr-8 font-mono"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                €
              </span>
            </div>
          </Field>
          <Field
            label="Verkaufspreis (Netto)"
            error={errors.salePriceStr}
            hint="Was du dem Kunden berechnest"
          >
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={form.salePriceStr}
                onChange={(e) =>
                  setForm({ ...form, salePriceStr: e.target.value })
                }
                placeholder="0,00"
                className="input w-full pr-8 font-mono"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                €
              </span>
            </div>
          </Field>
        </div>

        <Field label="Standardmenge" hint="Wie viele Einheiten typischerweise">
          <input
            type="number"
            min={1}
            value={form.defaultQuantity}
            onChange={(e) =>
              setForm({
                ...form,
                defaultQuantity: parseInt(e.target.value) || 1,
              })
            }
            className="input w-32 font-mono"
          />
        </Field>

        <Field label="URL (optional)">
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://"
            className="input w-full"
          />
        </Field>

        <Field label="Notiz (optional)">
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="z.B. Format, Material, Lieferzeit"
            rows={2}
            className="input w-full resize-none"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface p-3.5 hover:border-border-strong">
          <input
            type="checkbox"
            checked={form.visible}
            onChange={(e) => setForm({ ...form, visible: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">
              Im Rechner anzeigen
            </p>
            <p className="text-2xs text-ink-muted">
              Deaktivieren, um diese Leistung im Rechner auszublenden.
            </p>
          </div>
        </label>
      </form>
    </Modal>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </label>
      {children}
      {(hint || error) && (
        <p
          className={[
            'text-2xs',
            error ? 'text-danger font-medium' : 'text-ink-muted',
          ].join(' ')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
