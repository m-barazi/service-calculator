import { Fragment, useCallback, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { computeQuoteTotals, getItemName } from '../lib/quoteCalc'
import { generateQuotePdf } from '../lib/quotePdf'
import { formatEUR, formatDate, formatPriceInput, parseGermanNumber } from '../lib/format'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'
import type { Quote, QuoteItem, QuoteStatus, DiscountType, QuoteWithItems, QuoteTotals, Service, Category } from '../types'

// ── Status helpers ──────────────────────────────────────────────────────

const STATUS_MAP: Record<QuoteStatus, { label: string; cls: string }> = {
  draft: { label: 'Entwurf', cls: 'bg-ink-muted/10 text-ink-muted' },
  sent: { label: 'Gesendet', cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Angenommen', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Abgelehnt', cls: 'bg-red-100 text-red-700' },
}

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'sent', label: 'Gesendet' },
  { value: 'accepted', label: 'Angenommen' },
  { value: 'rejected', label: 'Abgelehnt' },
]

// ── Main component ──────────────────────────────────────────────────────

export function AngebotePage() {
  const {
    quotes,
    isLoadingQuotes,
    addQuote,
    updateQuote,
    deleteQuote,
    refreshQuotes,
    fetchQuoteDetail,
    addItem,
    updateItem,
    deleteItem,
    services,
    categories,
    settings,
  } = useApp()

  const [selectedQuote, setSelectedQuote] = useState<QuoteWithItems | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Quote | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [freeName, setFreeName] = useState('')
  const [freePrice, setFreePrice] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Computed totals for selected quote ──────────────────────────────────
  const totals: QuoteTotals | null = useMemo(() => {
    if (!selectedQuote) return null
    return computeQuoteTotals(
      selectedQuote.items,
      settings.vatRate,
      selectedQuote.discountType,
      selectedQuote.discountValue,
    )
  }, [selectedQuote, settings.vatRate])

  // ── Open detail view ────────────────────────────────────────────────────
  const openQuote = useCallback(async (id: string) => {
    const detail = await fetchQuoteDetail(id)
    setSelectedQuote(detail)
  }, [fetchQuoteDetail])

  // ── Create new quote ────────────────────────────────────────────────────
  const handleCreateQuote = useCallback(async () => {
    const created = await addQuote({
      title: 'Neues Angebot',
      status: 'draft',
      discountValue: 0,
    })
    const detail = await fetchQuoteDetail(created.id)
    setSelectedQuote(detail)
  }, [addQuote, fetchQuoteDetail])

  // ── Refresh selected quote ──────────────────────────────────────────────
  const refreshSelected = useCallback(async () => {
    if (!selectedQuote) return
    const detail = await fetchQuoteDetail(selectedQuote.id)
    setSelectedQuote(detail)
  }, [selectedQuote, fetchQuoteDetail])

  // ── Update quote field on blur ───────────────────────────────────────────
  const handleQuoteChange = useCallback(
    async (patch: Partial<Quote>) => {
      if (!selectedQuote) return
      await updateQuote(selectedQuote.id, patch)
      setSelectedQuote((prev) => (prev ? { ...prev, ...patch } : prev))
    },
    [selectedQuote, updateQuote],
  )

  // ── Add item from price list ─────────────────────────────────────────────
  const handleAddServiceItem = useCallback(
    async (serviceId: string) => {
      if (!selectedQuote) return
      const service = services.find((s) => s.id === serviceId)
      if (!service) return
      await addItem(selectedQuote.id, {
        serviceId: service.id,
        unitPrice: service.salePrice,
        quantity: 1,
        sortOrder: selectedQuote.items.length,
      })
      await refreshSelected()
      setAddItemModalOpen(false)
    },
    [selectedQuote, services, addItem, refreshSelected],
  )

  // ── Add freetext item ───────────────────────────────────────────────────
  const handleAddFreeItem = useCallback(async () => {
    if (!selectedQuote) return
    const name = freeName.trim()
    if (!name) return
    const price = parseGermanNumber(freePrice)
    await addItem(selectedQuote.id, {
      customName: name,
      unitPrice: price,
      quantity: 1,
      sortOrder: selectedQuote.items.length,
    })
    await refreshSelected()
    setFreeName('')
    setFreePrice('')
    setAddItemModalOpen(false)
  }, [selectedQuote, freeName, freePrice, addItem, refreshSelected])

  // ── Delete item ─────────────────────────────────────────────────────────
  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (!selectedQuote) return
      await deleteItem(selectedQuote.id, itemId)
      await refreshSelected()
    },
    [selectedQuote, deleteItem, refreshSelected],
  )

  // ── Update item quantity/price on blur ──────────────────────────────────
  const handleItemBlur = useCallback(
    async (itemId: string, field: 'quantity' | 'unitPrice', rawValue: string) => {
      if (!selectedQuote) return
      const parsed = field === 'quantity' ? Math.max(1, Math.floor(Number(rawValue) || 1)) : parseGermanNumber(rawValue)
      const item = selectedQuote.items.find((i) => i.id === itemId)
      if (!item) return
      // Skip if value unchanged
      const currentVal = field === 'quantity' ? item.quantity : item.unitPrice
      if (parsed === currentVal) return
      await updateItem(selectedQuote.id, itemId, { [field]: parsed })
      await refreshSelected()
    },
    [selectedQuote, updateItem, refreshSelected],
  )

  // ── Delete quote ────────────────────────────────────────────────────────
  const handleDeleteQuote = useCallback(async () => {
    if (!confirmDelete) return
    setIsDeleting(true)
    try {
      await deleteQuote(confirmDelete.id)
      setSelectedQuote(null)
      await refreshQuotes()
    } finally {
      setIsDeleting(false)
      setConfirmDelete(null)
    }
  }, [confirmDelete, deleteQuote, refreshQuotes])

  // ── PDF generation ──────────────────────────────────────────────────────
  const handlePdf = useCallback(
    (mode: 'customer' | 'internal') => {
      if (!selectedQuote || !totals) return
      generateQuotePdf(selectedQuote, totals, settings, {
        mode,
        showProfit: mode === 'internal',
      })
    },
    [selectedQuote, totals, settings],
  )

  // ── Save button ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!selectedQuote) return
    setSaving(true)
    try {
      await refreshSelected()
    } finally {
      setSaving(false)
    }
  }, [selectedQuote, refreshSelected])

  // ── Filtered services for add-item modal ────────────────────────────────
  const filteredServices = useMemo(() => {
    const q = itemSearch.trim().toLowerCase()
    if (!q) return services
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        categories.find((c) => c.id === s.categoryId)?.name.toLowerCase().includes(q),
    )
  }, [itemSearch, services, categories])

  const servicesByCategory = useMemo(() => {
    const map = new Map<string, typeof services>()
    for (const s of filteredServices) {
      const catId = s.categoryId ?? ''
      const list = map.get(catId) ?? []
      list.push(s)
      map.set(catId, list)
    }
    return map
  }, [filteredServices])

  const usedServiceIds = useMemo(
    () => new Set(selectedQuote?.items.filter((i) => i.serviceId).map((i) => i.serviceId)),
    [selectedQuote],
  )

  // ── Render ──────────────────────────────────────────────────────────────

  // Loading state
  if (isLoadingQuotes && quotes.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink-muted border-t-ink" />
            <p className="mt-4 text-sm text-ink-soft">Angebote wird geladen...</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selectedQuote) {
    const q = selectedQuote
    const statusInfo = STATUS_MAP[q.status] ?? STATUS_MAP.draft

    return (
      <Fragment>
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        {/* Back button */}
        <button
          onClick={() => setSelectedQuote(null)}
          className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </button>

        {/* Two-panel layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* ── Left panel: Positionen ──────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Positionen</p>
                <h2 className="text-lg font-semibold text-ink">
                  {q.items.length} Position{q.items.length === 1 ? '' : 'en'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setItemSearch('')
                  setFreeName('')
                  setFreePrice('')
                  setAddItemModalOpen(true)
                }}
                className="btn-primary text-sm"
              >
                <Plus className="h-4 w-4" />
                Position hinzufügen
              </button>
            </div>

            {/* Items list */}
            {q.items.length === 0 ? (
              <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
                <FileText className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
                <p className="mt-2 text-sm font-medium text-ink">
                  Noch keine Positionen
                </p>
                <p className="text-2xs text-ink-muted">
                  Füge Leistungen aus der Preisliste oder Freitext-Positionen hinzu.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {q.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onDelete={() => handleDeleteItem(item.id)}
                    onBlurQuantity={(val) => handleItemBlur(item.id, 'quantity', val)}
                    onBlurPrice={(val) => handleItemBlur(item.id, 'unitPrice', val)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Right panel: Angebot-Details ─────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="eyebrow">Angebot-Details</p>
              <h2 className="text-lg font-semibold text-ink">Bearbeiten</h2>
            </div>

            <div className="card flex flex-col gap-4 p-5">
              {/* Title */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Titel
                </span>
                <input
                  type="text"
                  value={q.title}
                  onChange={(e) =>
                    setSelectedQuote((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    )
                  }
                  onBlur={(e) => handleQuoteChange({ title: e.target.value })}
                  className="input"
                  placeholder="Angebots-Titel"
                />
              </label>

              {/* Customer name */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Kunde
                </span>
                <input
                  type="text"
                  value={q.customerName ?? ''}
                  onChange={(e) =>
                    setSelectedQuote((prev) =>
                      prev
                        ? { ...prev, customerName: e.target.value || undefined }
                        : prev,
                    )
                  }
                  onBlur={(e) =>
                    handleQuoteChange({
                      customerName: e.target.value || undefined,
                    })
                  }
                  className="input"
                  placeholder="Kundenname"
                />
              </label>

              {/* Status */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Status
                </span>
                <div className="relative">
                  <select
                    value={q.status}
                    onChange={(e) =>
                      handleQuoteChange({ status: e.target.value as QuoteStatus })
                    }
                    className="input appearance-none pr-10"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                </div>
              </label>

              {/* Valid until */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Gültig bis
                </span>
                <input
                  type="date"
                  value={q.validUntil ?? ''}
                  onChange={(e) =>
                    setSelectedQuote((prev) =>
                      prev
                        ? { ...prev, validUntil: e.target.value || undefined }
                        : prev,
                    )
                  }
                  onBlur={(e) =>
                    handleQuoteChange({
                      validUntil: e.target.value || undefined,
                    })
                  }
                  className="input"
                />
              </label>

              {/* Discount */}
              <div>
                <span className="mb-2 block text-sm font-medium text-ink-soft">
                  Rabatt
                </span>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'none' as const, label: 'Kein' },
                      { value: 'percent' as const, label: '%' },
                      { value: 'amount' as const, label: '€' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const discountType =
                          opt.value === 'none' ? undefined : (opt.value as DiscountType)
                        handleQuoteChange({
                          discountType,
                          discountValue: discountType ? q.discountValue : 0,
                        })
                        setSelectedQuote((prev) =>
                          prev
                            ? { ...prev, discountType, discountValue: discountType ? prev.discountValue : 0 }
                            : prev,
                        )
                      }}
                      className={[
                        'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                        (opt.value === 'none' && !q.discountType) ||
                        (opt.value !== 'none' && q.discountType === opt.value)
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-ink-soft hover:border-ink-faint hover:text-ink',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {q.discountType && (
                  <div className="mt-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={q.discountValue === 0 ? '' : String(q.discountValue)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setSelectedQuote((prev) =>
                          prev ? { ...prev, discountValue: val } : prev,
                        )
                      }}
                      onBlur={(e) =>
                        handleQuoteChange({
                          discountValue: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input"
                      placeholder={
                        q.discountType === 'percent' ? 'Rabatt in %' : 'Rabatt in €'
                      }
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                  Notizen (intern)
                </span>
                <textarea
                  value={q.notes ?? ''}
                  onChange={(e) =>
                    setSelectedQuote((prev) =>
                      prev ? { ...prev, notes: e.target.value } : prev,
                    )
                  }
                  onBlur={(e) => handleQuoteChange({ notes: e.target.value })}
                  className="input min-h-[80px] resize-y"
                  placeholder="Interne Notizen, nicht im Kunden-PDF..."
                  rows={3}
                />
              </label>
            </div>

            {/* Computed totals */}
            {totals && (
              <div className="card p-5">
                <p className="eyebrow mb-3">Berechnung</p>
                <div className="flex flex-col gap-2">
                  <TotalRow label="Zwischensumme (Netto)" value={formatEUR(totals.subtotalNet)} />
                  {totals.discountAmount > 0 && (
                    <TotalRow
                      label={q.discountType === 'percent' ? `Rabatt (-${q.discountValue}%)` : 'Rabatt'}
                      value={formatEUR(-totals.discountAmount)}
                      className="text-ink-soft"
                    />
                  )}
                  <TotalRow label="Gesamt (Netto)" value={formatEUR(totals.totalNet)} />
                  <TotalRow
                    label={`MwSt (${(settings.vatRate * 100).toFixed(0).replace('.', ',')}%)`}
                    value={formatEUR(totals.vatAmount)}
                    className="text-ink-soft"
                  />
                  <div className="mt-1 border-t border-border pt-2">
                    <TotalRow
                      label="Gesamt (Brutto)"
                      value={formatEUR(totals.totalGross)}
                      bold
                      accent
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Speichert...' : 'Änderungen speichern'}
          </button>
          <button
            onClick={() => handlePdf('customer')}
            className="btn-secondary"
            disabled={!totals}
          >
            <Download className="h-4 w-4" />
            PDF Kunden-Version
          </button>
          <button
            onClick={() => handlePdf('internal')}
            className="btn-secondary"
            disabled={!totals}
          >
            <Download className="h-4 w-4" />
            PDF Intern
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setConfirmDelete(q)}
            className="btn-danger"
          >
            <Trash2 className="h-4 w-4" />
            Löschen
          </button>
        </div>
      </div>

      {/* Add-item modal */}
      <AddItemModal
        open={addItemModalOpen}
        onClose={() => setAddItemModalOpen(false)}
        onAddService={handleAddServiceItem}
        onAddFree={handleAddFreeItem}
        servicesByCategory={servicesByCategory}
        usedServiceIds={usedServiceIds}
        search={itemSearch}
        onSearchChange={setItemSearch}
        freeName={freeName}
        onFreeNameChange={setFreeName}
        freePrice={freePrice}
        onFreePriceChange={setFreePrice}
        categories={categories}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteQuote}
        title="Angebot löschen?"
        description={`"${confirmDelete?.title}" wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel={isDeleting ? 'Löschen...' : 'Löschen'}
        variant="danger"
        disabled={isDeleting}
      />
      </Fragment>
    )
  }

  // ── List view ───────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Angebote</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Angebote
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Erstelle und verwalte Angebote für deine Kunden.
          </p>
        </div>
        <button onClick={handleCreateQuote} className="btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Neues Angebot
        </button>
      </div>

      {/* Quote cards */}
      {quotes.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <FileText className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-ink">
            Keine Angebote vorhanden
          </p>
          <p className="text-2xs text-ink-muted">
            Erstelle dein erstes Angebot, um loszulegen.
          </p>
          <button onClick={handleCreateQuote} className="btn-primary mt-3">
            <Plus className="h-4 w-4" />
            Erstes Angebot erstellen
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((quote) => {
            const statusInfo = STATUS_MAP[quote.status] ?? STATUS_MAP.draft
            return (
              <button
                key={quote.id}
                onClick={() => openQuote(quote.id)}
                className="card group flex flex-col gap-3 p-5 text-left transition hover:border-ink-faint"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-ink truncate">
                    {quote.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-medium ${statusInfo.cls}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                {quote.customerName && (
                  <p className="text-sm text-ink-soft truncate">
                    {quote.customerName}
                  </p>
                )}
                <p className="text-2xs text-ink-muted">
                  {formatDate(quote.createdAt)}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────

function ItemRow({
  item,
  onDelete,
  onBlurQuantity,
  onBlurPrice,
}: {
  item: QuoteItem
  onDelete: () => void
  onBlurQuantity: (val: string) => void
  onBlurPrice: (val: string) => void
}) {
  const name = getItemName(item)
  const lineTotal = item.quantity * item.unitPrice

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink truncate">{name}</p>
        {item.customNote && (
          <p className="text-2xs text-ink-muted truncate">{item.customNote}</p>
        )}
      </div>

      {/* Quantity */}
      <div className="flex items-center gap-2">
        <label className="text-2xs font-medium text-ink-muted sm:hidden">Menge</label>
        <input
          type="text"
          inputMode="numeric"
          defaultValue={item.quantity}
          onBlur={(e) => onBlurQuantity(e.target.value)}
          className="input w-20 text-center num"
        />
      </div>

      {/* Unit price */}
      <div className="flex items-center gap-2">
        <label className="text-2xs font-medium text-ink-muted sm:hidden">Preis</label>
        <input
          type="text"
          inputMode="decimal"
          defaultValue={formatPriceInput(item.unitPrice)}
          onBlur={(e) => onBlurPrice(e.target.value)}
          className="input w-28 text-right num"
        />
      </div>

      {/* Line total */}
      <div className="num text-sm font-semibold text-ink min-w-[80px] text-right">
        {formatEUR(lineTotal)}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="qty-btn text-danger hover:bg-danger/10 shrink-0"
        title="Position entfernen"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function TotalRow({
  label,
  value,
  bold,
  accent,
  className = '',
}: {
  label: string
  value: string
  bold?: boolean
  accent?: boolean
  className?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={[
          'text-sm',
          bold ? 'font-semibold text-ink' : 'text-ink-soft',
          className,
        ].join(' ')}
      >
        {label}
      </span>
      <span
        className={[
          'num text-sm',
          bold ? 'font-bold' : '',
          accent ? 'text-accent-strong' : bold ? 'text-ink' : 'text-ink',
          className,
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

function AddItemModal({
  open,
  onClose,
  onAddService,
  onAddFree,
  servicesByCategory,
  usedServiceIds,
  search,
  onSearchChange,
  freeName,
  onFreeNameChange,
  freePrice,
  onFreePriceChange,
  categories,
}: {
  open: boolean
  onClose: () => void
  onAddService: (serviceId: string) => void
  onAddFree: () => void
  servicesByCategory: Map<string, Service[]>
  usedServiceIds: Set<string | undefined>
  search: string
  onSearchChange: (v: string) => void
  freeName: string
  onFreeNameChange: (v: string) => void
  freePrice: string
  onFreePriceChange: (v: string) => void
  categories: Category[]
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Position hinzufügen"
      size="lg"
    >
      <div className="flex flex-col gap-5">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Leistung suchen..."
            className="input w-full pl-10"
            autoFocus
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 qty-btn"
              aria-label="Suche löschen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* From price list */}
        <div>
          <p className="eyebrow mb-3">Aus Preisliste</p>
          <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto">
            {Array.from(servicesByCategory.entries()).map(([catId, svcs]) => {
              const cat = categories.find((c) => c.id === catId)
              return (
                <div key={catId}>
                  {cat && (
                    <p className="sticky top-0 bg-elevated py-1 text-xs font-semibold text-ink-muted">
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </p>
                  )}
                  {svcs.map((s) => {
                    const used = usedServiceIds.has(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => onAddService(s.id)}
                        disabled={used}
                        className={[
                          'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition',
                          used
                            ? 'cursor-not-allowed opacity-40'
                            : 'hover:bg-canvas/60',
                        ].join(' ')}
                      >
                        <span className="text-sm font-medium text-ink truncate">
                          {s.name}
                        </span>
                        <span className="num text-sm text-ink-soft shrink-0">
                          {formatEUR(s.salePrice)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {servicesByCategory.size === 0 && (
              <p className="py-4 text-center text-sm text-ink-muted">
                Keine Leistungen gefunden
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Freitext */}
        <div>
          <p className="eyebrow mb-3">Freitext</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                Bezeichnung
              </span>
              <input
                type="text"
                value={freeName}
                onChange={(e) => onFreeNameChange(e.target.value)}
                className="input"
                placeholder="z.B. Sonderleistung"
              />
            </label>
            <label className="w-full sm:w-36">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                Preis (€)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={freePrice}
                onChange={(e) => onFreePriceChange(e.target.value)}
                className="input num"
                placeholder="0,00"
              />
            </label>
            <button
              onClick={onAddFree}
              disabled={!freeName.trim()}
              className="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Hinzufügen
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}