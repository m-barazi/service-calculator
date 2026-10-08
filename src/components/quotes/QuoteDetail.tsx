import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Download,
  FileText,
  History,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react'
import { useApp } from '../../hooks/useApp'
import { computeQuoteTotals } from '../../lib/quoteCalc'
import { generateQuotePdf } from '../../lib/quotePdf'
import { formatDateTime, formatEUR, formatPriceInput, formatQuoteStatus, parseGermanNumber } from '../../lib/format'
import { CustomerSelect } from '../CustomerSelect'
import { ProjectSelect } from '../ProjectSelect'
import { ItemRow } from './ItemRow'
import { TotalRow } from './TotalRow'
import { AddItemModal } from './AddItemModal'
import { STATUS_MAP, STATUS_OPTIONS } from './status'
import type { DiscountType, QuoteStatus, QuoteStatusHistoryEntry, QuoteWithItems } from '../../types'

interface QuoteDetailProps {
  quote: QuoteWithItems
  onUpdate: (q: QuoteWithItems) => void
  onBack: () => void
  onDuplicate: (id: string) => void
  onDelete: () => void
  isDuplicating: boolean
}

export function QuoteDetail({
  quote: q,
  onUpdate,
  onBack,
  onDuplicate,
  onDelete,
  isDuplicating,
}: QuoteDetailProps) {
  const {
    services,
    categories,
    settings,
    addItem,
    updateItem,
    deleteItem,
    updateQuote,
    updateQuoteStatus,
    fetchQuoteDetail,
    fetchQuoteHistory,
    addInvoiceFromQuote,
  } = useApp()
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [freeName, setFreeName] = useState('')
  const [freePrice, setFreePrice] = useState('')
  const [history, setHistory] = useState<QuoteStatusHistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)

  const statusInfo = STATUS_MAP[q.status] ?? STATUS_MAP.draft

  useEffect(() => {
    let cancelled = false
    fetchQuoteHistory(q.id)
      .then((data) => {
        if (!cancelled) setHistory(data)
      })
      .catch(() => {
        // silently ignore; toast is handled by useApp
      })
    return () => {
      cancelled = true
    }
  }, [q.id, q.status, fetchQuoteHistory])

  const totals = useMemo(
    () => computeQuoteTotals(q.items, settings.vatRate, q.discountType, q.discountValue),
    [q.items, settings.vatRate, q.discountType, q.discountValue],
  )

  const handleQuoteChange = useCallback(
    async (patch: Partial<QuoteWithItems>) => {
      await updateQuote(q.id, patch)
      onUpdate({ ...q, ...patch })
    },
    [q, updateQuote, onUpdate],
  )

  const handleStatusChange = useCallback(
    async (newStatus: QuoteStatus) => {
      if (newStatus === q.status) return
      setIsChangingStatus(true)
      try {
        await updateQuoteStatus(q.id, newStatus)
        const detail = await fetchQuoteDetail(q.id)
        onUpdate(detail)
      } finally {
        setIsChangingStatus(false)
      }
    },
    [q.id, q.status, updateQuoteStatus, fetchQuoteDetail, onUpdate],
  )

  const refreshSelected = useCallback(async () => {
    const detail = await fetchQuoteDetail(q.id)
    onUpdate(detail)
  }, [q.id, fetchQuoteDetail, onUpdate])

  const handleAddServiceItem = useCallback(
    async (serviceId: string) => {
      const service = services.find((s) => s.id === serviceId)
      if (!service) return
      await addItem(q.id, {
        serviceId: service.id,
        unitPrice: service.salePrice,
        quantity: service.defaultQuantity,
        sortOrder: q.items.length,
      })
      await refreshSelected()
      setAddItemModalOpen(false)
      setItemSearch('')
    },
    [q, services, addItem, refreshSelected],
  )

  const handleAddFreeItem = useCallback(async () => {
    const name = freeName.trim()
    if (!name) return
    const price = parseGermanNumber(freePrice)
    if (!price) return
    await addItem(q.id, {
      customName: name,
      unitPrice: price,
      quantity: 1,
      sortOrder: q.items.length,
    })
    await refreshSelected()
    setFreeName('')
    setFreePrice('')
    setAddItemModalOpen(false)
  }, [q, freeName, freePrice, addItem, refreshSelected])

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      await deleteItem(q.id, itemId)
      await refreshSelected()
    },
    [q.id, deleteItem, refreshSelected],
  )

  const handleItemBlur = useCallback(
    async (itemId: string, field: 'quantity' | 'unitPrice' | 'purchasePrice', rawValue: string) => {
      const parsed = field === 'quantity' ? Math.max(1, Math.floor(Number(rawValue) || 1)) : parseGermanNumber(rawValue)
      const item = q.items.find((i) => i.id === itemId)
      if (!item) return
      const currentVal = field === 'quantity' ? item.quantity : field === 'unitPrice' ? item.unitPrice : (item.purchasePrice ?? item.service?.purchasePrice ?? 0)
      if (parsed === currentVal) return
      if (field === 'purchasePrice') {
        const servicePrice = item.service?.purchasePrice ?? 0
        if (parsed === servicePrice) {
          await updateItem(q.id, itemId, { purchasePrice: undefined })
        } else {
          await updateItem(q.id, itemId, { [field]: parsed })
        }
      } else {
        await updateItem(q.id, itemId, { [field]: parsed })
      }
      await refreshSelected()
    },
    [q, updateItem, refreshSelected],
  )

  const handleBlurQuantity = useCallback(
    (itemId: string, val: string) => handleItemBlur(itemId, 'quantity', val),
    [handleItemBlur],
  )
  const handleBlurPrice = useCallback(
    (itemId: string, val: string) => handleItemBlur(itemId, 'unitPrice', val),
    [handleItemBlur],
  )
  const handleBlurPurchasePrice = useCallback(
    (itemId: string, val: string) => handleItemBlur(itemId, 'purchasePrice', val),
    [handleItemBlur],
  )

  const handlePdf = useCallback(
    (mode: 'customer' | 'internal') => {
      generateQuotePdf(q, totals, settings, { mode, showProfit: mode === 'internal' })
    },
    [q, totals, settings],
  )

  const handleCreateInvoice = useCallback(async () => {
    if (q.status !== 'accepted') return
    setIsCreatingInvoice(true)
    try {
      await addInvoiceFromQuote(q.id)
    } finally {
      setIsCreatingInvoice(false)
    }
  }, [q.id, q.status, addInvoiceFromQuote])

  const filteredServices = useMemo(() => {
    const query = itemSearch.trim().toLowerCase()
    if (!query) return services
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        categories.find((c) => c.id === s.categoryId)?.name.toLowerCase().includes(query),
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
    () => new Set(q.items.filter((i) => i.serviceId).map((i) => i.serviceId)),
    [q.items],
  )

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </button>

      {/* Header with quote number */}
      <div className="mb-6 flex flex-col gap-1">
        {q.quoteNumber && (
          <p className="eyebrow">{q.quoteNumber}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{q.title}</h1>
        {q.customerName && (
          <p className="text-sm text-ink-soft">{q.customerName}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left panel: Positionen */}
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

          {q.items.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
              <FileText className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
              <p className="mt-2 text-sm font-medium text-ink">Noch keine Positionen</p>
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
                  onDelete={handleDeleteItem}
                  onBlurQuantity={handleBlurQuantity}
                  onBlurPrice={handleBlurPrice}
                  onBlurPurchasePrice={item.service ? handleBlurPurchasePrice : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel: Angebot-Details */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="eyebrow">Angebot-Details</p>
            <h2 className="text-lg font-semibold text-ink">Bearbeiten</h2>
          </div>

          <div className="card flex flex-col gap-4 p-5">
            {/* Title */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Titel</span>
              <input
                type="text"
                value={q.title}
                onChange={(e) => onUpdate({ ...q, title: e.target.value })}
                onBlur={(e) => handleQuoteChange({ title: e.target.value })}
                className="input"
                placeholder="Angebots-Titel"
              />
            </label>

            {/* Customer */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Kunde</span>
              <CustomerSelect
                value={q.customer}
                onChange={(customer) => {
                  handleQuoteChange({
                    customerId: customer?.id,
                    customerName: customer?.name,
                  })
                  onUpdate({
                    ...q,
                    customerId: customer?.id,
                    customerName: customer?.name,
                    customer,
                  })
                }}
              />
            </label>

            {/* Project */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Projekt</span>
              <ProjectSelect
                value={q.project}
                onChange={(project) => {
                  handleQuoteChange({
                    projectId: project?.id,
                    projectName: project?.name,
                  })
                  onUpdate({
                    ...q,
                    projectId: project?.id,
                    projectName: project?.name,
                    project,
                  })
                }}
                customerId={q.customerId}
              />
            </label>

            {/* Status */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Status</span>
              <div className="relative">
                <select
                  value={q.status}
                  onChange={(e) => handleStatusChange(e.target.value as QuoteStatus)}
                  disabled={isChangingStatus}
                  className="input appearance-none pr-10 disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              </div>
            </label>

            {/* Status history */}
            <div className="border-t border-border pt-4">
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-ink"
              >
                <History className="h-4 w-4" />
                Status-Historie
                <span className="badge-neutral text-2xs">{history.length}</span>
              </button>
              {historyOpen && (
                <div className="mt-3 space-y-2">
                  {history.length === 0 ? (
                    <p className="text-2xs text-ink-muted">Noch keine Status-Änderungen.</p>
                  ) : (
                    history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-canvas/40 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-ink-muted">
                            {entry.oldStatus ? formatQuoteStatus(entry.oldStatus) : '—'}
                          </span>
                          <span className="text-ink-muted">→</span>
                          <span className="font-medium text-ink">
                            {formatQuoteStatus(entry.newStatus)}
                          </span>
                        </div>
                        <span className="text-2xs text-ink-muted">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Valid until */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Gültig bis</span>
              <input
                type="date"
                value={q.validUntil ?? ''}
                onChange={(e) => onUpdate({ ...q, validUntil: e.target.value || undefined })}
                onBlur={(e) => handleQuoteChange({ validUntil: e.target.value || undefined })}
                className="input"
              />
            </label>

            {/* Discount */}
            <div>
              <span className="mb-2 block text-sm font-medium text-ink-soft">Rabatt</span>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'none' as const, label: 'Kein' },
                    { value: 'percent' as const, label: '%' },
                    { value: 'amount' as const, label: '€' },
                  ] as const
                ).map((opt) => {
                  const discountType = opt.value === 'none' ? undefined : (opt.value as DiscountType)
                  const active =
                    (opt.value === 'none' && !q.discountType) ||
                    (opt.value !== 'none' && q.discountType === opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handleQuoteChange({
                          discountType,
                          discountValue: discountType ? q.discountValue : 0,
                        })
                        onUpdate({
                          ...q,
                          discountType,
                          discountValue: discountType ? q.discountValue : 0,
                        })
                      }}
                      className={[
                        'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                        active
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-ink-soft hover:border-ink-faint hover:text-ink',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {q.discountType && (
                <div className="mt-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={q.discountValue === 0 ? '' : formatPriceInput(q.discountValue)}
                    onChange={(e) => {
                      const val = parseGermanNumber(e.target.value)
                      onUpdate({ ...q, discountValue: val })
                    }}
                    onBlur={(e) => handleQuoteChange({ discountValue: parseGermanNumber(e.target.value) })}
                    className="input"
                    placeholder={q.discountType === 'percent' ? 'Rabatt in %' : 'Rabatt in €'}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Notizen (intern)</span>
              <textarea
                value={q.notes ?? ''}
                onChange={(e) => onUpdate({ ...q, notes: e.target.value })}
                onBlur={(e) => handleQuoteChange({ notes: e.target.value })}
                className="input min-h-[80px] resize-y"
                placeholder="Interne Notizen, nicht im Kunden-PDF..."
                rows={3}
              />
            </label>
          </div>

          {/* Computed totals */}
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
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button onClick={() => handlePdf('customer')} className="btn-secondary" disabled={!totals}>
          <Download className="h-4 w-4" />
          PDF Kunden-Version
        </button>
        <button onClick={() => handlePdf('internal')} className="btn-secondary" disabled={!totals}>
          <Download className="h-4 w-4" />
          PDF Intern
        </button>
        {q.status === 'accepted' && (
          <button
            onClick={handleCreateInvoice}
            className="btn-primary"
            disabled={isCreatingInvoice}
          >
            <Receipt className="h-4 w-4" />
            {isCreatingInvoice ? 'Rechnung wird erstellt...' : 'Rechnung erstellen'}
          </button>
        )}
        <button
          onClick={() => onDuplicate(q.id)}
          className="btn-secondary"
          disabled={isDuplicating}
        >
          <Copy className="h-4 w-4" />
          Duplizieren
        </button>
        <div className="flex-1" />
        <button onClick={onDelete} className="btn-danger">
          <Trash2 className="h-4 w-4" />
          Löschen
        </button>
      </div>

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
    </div>
  )
}
