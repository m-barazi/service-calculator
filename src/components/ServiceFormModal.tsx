import { useEffect, useState } from 'react'
import type { Service } from '../types'
import { Modal } from './Modal'
import { useApp } from '../hooks/useApp'
import { formatPriceInput } from '../lib/format'

interface ServiceFormModalProps {
  open: boolean
  onClose: () => void
  service?: Service
}

interface FormState {
  name: string
  category: string
  purchasePriceStr: string
  purchaseGrossStr: string
  salePriceStr: string
  saleGrossStr: string
  profitNetStr: string
  profitGrossStr: string
  defaultQuantity: number
  url: string
  note: string
  visible: boolean
}

const empty: FormState = {
  name: '',
  category: '',
  purchasePriceStr: '0',
  purchaseGrossStr: '0',
  salePriceStr: '0',
  saleGrossStr: '0',
  profitNetStr: '0',
  profitGrossStr: '0',
  defaultQuantity: 1,
  url: '',
  note: '',
  visible: true,
}

/** Parse German-format price string to number. Returns null on invalid. */
const parsePrice = (s: string): number | null => {
  const cleaned = s.replace(/\./g, '').replace(',', '.').trim()
  if (cleaned === '') return 0
  const n = parseFloat(cleaned)
  return isNaN(n) || n < 0 ? null : n
}

export function ServiceFormModal({
  open,
  onClose,
  service,
}: ServiceFormModalProps) {
  const { addService, updateService, categories, settings } = useApp()
  const vatRate = settings.vatRate
  const vatFactor = 1 + vatRate

  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when service or open state changes
  useEffect(() => {
    if (!open) return
    if (service) {
      const purchaseNet = service.purchasePrice
      const saleNet = service.salePrice
      const profitNet = saleNet - purchaseNet
      setForm({
        name: service.name,
        category: service.category,
        purchasePriceStr: formatPriceInput(purchaseNet),
        purchaseGrossStr: formatPriceInput(purchaseNet * vatFactor),
        salePriceStr: formatPriceInput(saleNet),
        saleGrossStr: formatPriceInput(saleNet * vatFactor),
        profitNetStr: formatPriceInput(profitNet),
        profitGrossStr: formatPriceInput(profitNet * vatFactor),
        defaultQuantity: service.defaultQuantity,
        url: service.url ?? '',
        note: service.note ?? '',
        visible: service.visible,
      })
    } else {
      setForm(empty)
    }
    setErrors({})
  }, [service, open, vatFactor])

  /** Update dependent price fields based on which field changed */
  const handlePriceChange = (
    field: keyof Pick<FormState, 'purchasePriceStr' | 'purchaseGrossStr' | 'salePriceStr' | 'saleGrossStr' | 'profitNetStr' | 'profitGrossStr'>,
    rawValue: string,
  ) => {
    const parsed = parsePrice(rawValue)
    if (parsed === null) {
      // Invalid input — just store the raw string, don't recalculate
      setForm((prev) => ({ ...prev, [field]: rawValue }))
      return
    }

    // Get current net values (before this change)
    setForm((prev) => {
      const purchaseNet = field === 'purchasePriceStr' ? parsed
        : field === 'purchaseGrossStr' ? parsed / vatFactor
        : parsePrice(prev.purchasePriceStr) ?? 0

      const saleNet = field === 'salePriceStr' ? parsed
        : field === 'saleGrossStr' ? parsed / vatFactor
        : field === 'profitNetStr' ? (purchaseNet + parsed)
        : field === 'profitGrossStr' ? (purchaseNet + parsed / vatFactor)
        : parsePrice(prev.salePriceStr) ?? 0

      const purchaseGross = field === 'purchaseGrossStr' ? parsed : purchaseNet * vatFactor
      const saleGross = field === 'saleGrossStr' ? parsed : saleNet * vatFactor
      const profitNet = field === 'profitNetStr' ? parsed : saleNet - purchaseNet
      const profitGross = field === 'profitGrossStr' ? parsed : profitNet * vatFactor

      return {
        ...prev,
        purchasePriceStr: field === 'purchasePriceStr' ? rawValue : formatPriceInput(purchaseNet),
        purchaseGrossStr: field === 'purchaseGrossStr' ? rawValue : formatPriceInput(purchaseGross),
        salePriceStr: field === 'salePriceStr' ? rawValue : formatPriceInput(saleNet),
        saleGrossStr: field === 'saleGrossStr' ? rawValue : formatPriceInput(saleGross),
        profitNetStr: field === 'profitNetStr' ? rawValue : formatPriceInput(profitNet),
        profitGrossStr: field === 'profitGrossStr' ? rawValue : formatPriceInput(profitGross),
      }
    })
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

        {/* ── Price grid (3 rows × 2 columns) ── */}
        <div className="rounded-xl border border-border bg-surface/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
              Preise
            </span>
            <span className="text-2xs text-ink-faint">
              (MwSt. {(vatRate * 100).toFixed(0).replace('.', ',')}&nbsp;%)
            </span>
          </div>

          {/* Row 1: Einkauf */}
          <div className="grid gap-3 sm:grid-cols-2">
            <PriceField
              label="Einkaufspreis netto"
              hint="Was du für eine Einheit zahlst"
              value={form.purchasePriceStr}
              error={errors.purchasePriceStr}
              onChange={(v) => handlePriceChange('purchasePriceStr', v)}
            />
            <PriceField
              label="Einkaufspreis brutto"
              value={form.purchaseGrossStr}
              onChange={(v) => handlePriceChange('purchaseGrossStr', v)}
            />
          </div>

          {/* Row 2: Verkauf */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <PriceField
              label="Verkaufspreis netto"
              hint="Was du dem Kunden berechnest"
              value={form.salePriceStr}
              error={errors.salePriceStr}
              onChange={(v) => handlePriceChange('salePriceStr', v)}
            />
            <PriceField
              label="Verkaufspreis brutto"
              value={form.saleGrossStr}
              onChange={(v) => handlePriceChange('saleGrossStr', v)}
            />
          </div>

          {/* Row 3: Gewinn (highlighted) */}
          <div className="mt-3 grid gap-3 rounded-lg bg-accent/5 p-3 sm:grid-cols-2">
            <PriceField
              label="Gewinn netto"
              value={form.profitNetStr}
              onChange={(v) => handlePriceChange('profitNetStr', v)}
              highlight
            />
            <PriceField
              label="Gewinn brutto"
              value={form.profitGrossStr}
              onChange={(v) => handlePriceChange('profitGrossStr', v)}
              highlight
            />
          </div>
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

/** Reusable price input field with € suffix */
function PriceField({
  label,
  hint,
  error,
  value,
  onChange,
  highlight,
}: {
  label: string
  hint?: string
  error?: string
  value: string
  onChange: (value: string) => void
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className={[
          'text-2xs font-semibold uppercase tracking-wider',
          highlight ? 'text-accent' : 'text-ink-muted',
        ].join(' ')}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          className={[
            'input w-full pr-8 font-mono',
            highlight && 'border-accent/30 bg-accent/5',
            error && 'border-danger',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
          €
        </span>
      </div>
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