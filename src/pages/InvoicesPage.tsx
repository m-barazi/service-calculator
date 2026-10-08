import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileText,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { computeQuoteTotals } from '../lib/quoteCalc'
import { generateInvoicePdf } from '../lib/invoicePdf'
import { formatDate, formatEUR, formatInvoiceStatus } from '../lib/format'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FilterChip } from '../components/quotes/FilterChip'
import type { Invoice, InvoiceStatus, InvoiceWithItems } from '../types'

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'sent', label: 'Versendet' },
  { value: 'paid', label: 'Bezahlt' },
  { value: 'overdue', label: 'Überfällig' },
  { value: 'cancelled', label: 'Storniert' },
]

const STATUS_MAP: Record<
  InvoiceStatus,
  { label: string; cls: string }
> = {
  draft: { label: 'Entwurf', cls: 'bg-ink-muted/10 text-ink-soft' },
  sent: { label: 'Versendet', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  paid: { label: 'Bezahlt', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  overdue: { label: 'Überfällig', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  cancelled: { label: 'Storniert', cls: 'bg-danger/10 text-danger' },
}

function filterInvoices(
  invoices: Invoice[],
  opts: { search: string; status: InvoiceStatus | 'all' },
): Invoice[] {
  const query = opts.search.trim().toLowerCase()
  return invoices.filter((inv) => {
    if (opts.status !== 'all' && inv.status !== opts.status) return false
    if (!query) return true
    const hay = [
      inv.invoiceNumber,
      inv.title,
      inv.customerName,
      inv.projectName,
      inv.quoteNumber,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(query)
  })
}

export function InvoicesPage() {
  const {
    invoices,
    isLoadingInvoices,
    settings,
    refreshInvoices,
    fetchInvoiceDetail,
    updateInvoice,
    deleteInvoice,
  } = useApp()

  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const filteredInvoices = useMemo(
    () => filterInvoices(invoices, { search, status: statusFilter }),
    [invoices, search, statusFilter],
  )

  const openInvoice = useCallback(
    async (id: string) => {
      const detail = await fetchInvoiceDetail(id)
      setSelectedInvoice(detail)
    },
    [fetchInvoiceDetail],
  )

  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || isLoadingInvoices) return
    if (!invoices.some((inv) => inv.id === id)) return
    openInvoice(id).catch(() => {})
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoadingInvoices, invoices])

  const handleStatusChange = useCallback(
    async (newStatus: InvoiceStatus) => {
      if (!selectedInvoice || newStatus === selectedInvoice.status) return
      setIsUpdatingStatus(true)
      try {
        await updateInvoice(selectedInvoice.id, { status: newStatus })
        const detail = await fetchInvoiceDetail(selectedInvoice.id)
        setSelectedInvoice(detail)
      } finally {
        setIsUpdatingStatus(false)
      }
    },
    [selectedInvoice, updateInvoice, fetchInvoiceDetail],
  )

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    setIsDeleting(true)
    try {
      await deleteInvoice(confirmDelete.id)
      setSelectedInvoice(null)
      await refreshInvoices()
    } finally {
      setIsDeleting(false)
      setConfirmDelete(null)
    }
  }, [confirmDelete, deleteInvoice, refreshInvoices])

  const handlePdf = useCallback(
    (invoice: InvoiceWithItems) => {
      generateInvoicePdf(invoice, settings)
    },
    [settings],
  )

  if (isLoadingInvoices && invoices.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink-muted border-t-ink" />
            <p className="mt-4 text-sm text-ink-soft">Rechnungen werden geladen...</p>
          </div>
        </div>
      </div>
    )
  }

  if (selectedInvoice) {
    const statusInfo = STATUS_MAP[selectedInvoice.status] ?? STATUS_MAP.draft
    const totals = computeQuoteTotals(
      selectedInvoice.items,
      settings.vatRate,
      selectedInvoice.quote?.discountType,
      selectedInvoice.quote?.discountValue,
    )
    const totalNet = selectedInvoice.items.length > 0 ? totals.totalNet : selectedInvoice.totalNet
    const totalGross =
      selectedInvoice.items.length > 0 ? totals.totalGross : selectedInvoice.totalGross
    const vatAmount = totalGross - totalNet

    return (
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <button
          onClick={() => setSelectedInvoice(null)}
          className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </button>

        <div className="mb-6 flex flex-col gap-1">
          <p className="eyebrow">{selectedInvoice.invoiceNumber}</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {selectedInvoice.title}
          </h1>
          {(selectedInvoice.customerName || selectedInvoice.projectName) && (
            <p className="text-sm text-ink-soft">
              {selectedInvoice.customerName}
              {selectedInvoice.customerName && selectedInvoice.projectName && ' · '}
              {selectedInvoice.projectName}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Positionen</p>
                <h2 className="text-lg font-semibold text-ink">
                  {selectedInvoice.items.length} Position
                  {selectedInvoice.items.length === 1 ? '' : 'en'}
                </h2>
              </div>
            </div>

            {selectedInvoice.items.length === 0 ? (
              <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
                <FileText className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
                <p className="mt-2 text-sm font-medium text-ink">Keine Positionen vorhanden</p>
                <p className="text-2xs text-ink-muted">
                  Das verknüpfte Angebot wurde möglicherweise gelöscht.
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-canvas text-left text-2xs font-semibold uppercase text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3 text-right">Menge</th>
                      <th className="px-4 py-3 text-right">Einzelpreis</th>
                      <th className="px-4 py-3 text-right">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {totals.lines.map((line) => (
                      <tr key={line.item.id}>
                        <td className="px-4 py-3">
                          {line.item.service?.name ?? line.item.customName ?? '—'}
                          {line.item.customNote && (
                            <p className="text-2xs text-ink-muted">{line.item.customNote}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{line.item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatEUR(line.item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatEUR(line.lineNet)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="eyebrow">Rechnungs-Details</p>
              <h2 className="text-lg font-semibold text-ink">Bearbeiten</h2>
            </div>

            <div className="card flex flex-col gap-4 p-5">
              {/* Status */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">Status</span>
                <div className="relative">
                  <select
                    value={selectedInvoice.status}
                    onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
                    disabled={isUpdatingStatus}
                    className="input appearance-none pr-10 disabled:opacity-60"
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

              {/* Due date */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">Fällig am</span>
                <input
                  type="date"
                  value={selectedInvoice.dueDate ?? ''}
                  onChange={(e) =>
                    updateInvoice(selectedInvoice.id, { dueDate: e.target.value || undefined })
                  }
                  className="input"
                />
              </label>

              {/* Paid at */}
              {selectedInvoice.paidAt && (
                <div className="rounded-lg border border-border bg-canvas/40 px-3 py-2 text-sm">
                  <span className="text-ink-muted">Bezahlt am:</span>{' '}
                  <span className="font-medium text-ink">{formatDate(selectedInvoice.paidAt)}</span>
                </div>
              )}

              {/* Notes */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">Notizen (intern)</span>
                <textarea
                  value={selectedInvoice.notes ?? ''}
                  onChange={(e) =>
                    setSelectedInvoice({ ...selectedInvoice, notes: e.target.value })
                  }
                  onBlur={(e) => updateInvoice(selectedInvoice.id, { notes: e.target.value })}
                  className="input min-h-[80px] resize-y"
                  rows={3}
                />
              </label>
            </div>

            <div className="card p-5">
              <p className="eyebrow mb-3">Berechnung</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft">Zwischensumme (Netto)</span>
                  <span className="font-medium text-ink">{formatEUR(totals.subtotalNet)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-ink-soft">
                    <span>
                      {selectedInvoice.quote?.discountType === 'percent'
                        ? `Rabatt (-${selectedInvoice.quote.discountValue}%)`
                        : 'Rabatt'}
                    </span>
                    <span className="font-medium">{formatEUR(-totals.discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft">MwSt ({(settings.vatRate * 100).toFixed(0).replace('.', ',')}%)</span>
                  <span className="font-medium text-ink">{formatEUR(vatAmount)}</span>
                </div>
                <div className="mt-1 border-t border-border pt-2">
                  <div className="flex items-center justify-between text-base font-bold text-accent">
                    <span>Gesamt (Brutto)</span>
                    <span>{formatEUR(totalGross)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={() => handlePdf(selectedInvoice)} className="btn-secondary">
                <Download className="h-4 w-4" />
                PDF Rechnung
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
          <button
            onClick={() => setConfirmDelete(selectedInvoice)}
            className="btn-danger"
          >
            <Trash2 className="h-4 w-4" />
            Löschen
          </button>
        </div>

        <ConfirmDialog
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          title="Rechnung löschen?"
          description={`"${confirmDelete?.invoiceNumber}" wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`}
          confirmLabel={isDeleting ? 'Löschen...' : 'Löschen'}
          variant="danger"
          disabled={isDeleting}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Rechnungen</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Rechnungen</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Verwalte Rechnungen, die aus angenommenen Angeboten erstellt wurden.
          </p>
        </div>
      </div>

      {/* Search & filter */}
      {invoices.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechnungen suchen (Nummer, Titel, Kunde)..."
              className="input w-full pl-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 qty-btn"
                aria-label="Suche löschen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="Alle" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            {STATUS_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={statusFilter === opt.value}
                onClick={() => setStatusFilter(opt.value)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Invoice cards */}
      {invoices.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <ReceiptText className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-ink">Keine Rechnungen vorhanden</p>
          <p className="text-2xs text-ink-muted">
            Rechnungen werden aus angenommenen Angeboten erstellt.
          </p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Search className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-ink">Keine Treffer</p>
          <p className="text-2xs text-ink-muted">
            Passe die Suche oder den Status-Filter an.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredInvoices.map((invoice) => {
            const info = STATUS_MAP[invoice.status] ?? STATUS_MAP.draft
            return (
              <button
                key={invoice.id}
                onClick={() => openInvoice(invoice.id)}
                className="card group flex flex-col gap-3 p-5 text-left transition hover:border-ink-faint"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow mb-1">{invoice.invoiceNumber}</p>
                    <h3 className="font-semibold text-ink truncate">{invoice.title}</h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-medium ${info.cls}`}
                  >
                    {info.label}
                  </span>
                </div>
                {(invoice.customerName || invoice.projectName) && (
                  <p className="text-sm text-ink-soft truncate">
                    {invoice.customerName}
                    {invoice.customerName && invoice.projectName && ' · '}
                    {invoice.projectName}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold text-ink">
                    {formatEUR(invoice.totalGross)}
                  </span>
                  <span className="text-2xs text-ink-muted">{formatDate(invoice.createdAt)}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default InvoicesPage
