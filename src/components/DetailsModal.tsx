import { Download, FileText, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import type { CartTotals, Settings } from '../types'
import { formatEUR, formatPct } from '../lib/format'
import { generatePdfReport } from '../lib/pdf'
import { Modal } from './Modal'

interface DetailsModalProps {
  open: boolean
  onClose: () => void
  totals: CartTotals
  settings: Settings
}

export function DetailsModal({
  open,
  onClose,
  totals,
  settings,
}: DetailsModalProps) {
  const [customerName, setCustomerName] = useState('')
  const [projectTitle, setProjectTitle] = useState('Kostenvoranschlag')
  const [notes, setNotes] = useState('')
  const [includeProfit, setIncludeProfit] = useState(false)

  const handleExport = () => {
    generatePdfReport(totals, settings, {
      customerName: customerName.trim() || undefined,
      projectTitle: projectTitle.trim() || 'Kostenvoranschlag',
      notes: notes.trim() || undefined,
      showProfit: includeProfit,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detail-Übersicht"
      description={`${totals.lines.length} Position${
        totals.lines.length === 1 ? '' : 'en'
      } · ${totals.itemCount} Stück`}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Schließen
          </button>
          <button onClick={handleExport} className="btn-primary">
            <Download className="h-4 w-4" />
            PDF exportieren
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ─── Left: Line items + form ─────────────────── */}
        <div className="flex flex-col gap-6">
          {/* PDF Form */}
          <section className="card p-5">
            <p className="eyebrow">PDF-Bericht</p>
            <h3 className="mt-1 text-base font-semibold">Bericht-Details</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
                  Projekttitel
                </span>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="z.B. Marketing Q4 2026"
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
                  Kundenname
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                  className="input"
                />
              </label>
            </div>

            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
                Notizen
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Lieferzeit, Zahlungsbedingungen, Sonderkonditionen…"
                rows={3}
                className="input resize-none"
              />
            </label>

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface p-3.5 hover:border-border-strong">
              <input
                type="checkbox"
                checked={includeProfit}
                onChange={(e) => setIncludeProfit(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">
                  Gewinn-Übersicht im PDF anzeigen
                </p>
                <p className="text-2xs text-ink-muted">
                  Nur für interne Berichte — nicht für Kundenangebote.
                </p>
              </div>
            </label>
          </section>

          {/* Line items */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <p className="eyebrow">Positionen</p>
              <p className="text-2xs text-ink-muted">
                MwSt {(totals.vatRate * 100).toFixed(0).replace('.', ',')}%
              </p>
            </div>
            {/* Header (desktop) */}
            <div className="hidden grid-cols-[1fr_60px_110px_110px_120px] gap-2 border-b border-border bg-canvas/40 px-5 py-2.5 text-2xs font-medium uppercase tracking-wider text-ink-muted sm:grid">
              <span>Leistung</span>
              <span className="text-right">Menge</span>
              <span className="text-right">Einzelpreis</span>
              <span className="text-right">Netto</span>
              <span className="text-right">Brutto</span>
            </div>

            <div className="divide-y divide-border">
              {totals.lines.map((line) => (
                <div
                  key={line.service.id}
                  className="grid grid-cols-2 gap-2 px-5 py-3.5 sm:grid-cols-[1fr_60px_110px_110px_120px]"
                >
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-sm font-medium text-ink">
                      {line.service.name}
                    </p>
                    <p className="text-2xs text-ink-muted">
                      {line.service.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="num text-sm font-medium text-ink">
                      {line.quantity}×
                    </span>
                    <span className="block text-2xs text-ink-muted sm:hidden">
                      Menge
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="num text-sm text-ink-soft">
                      {formatEUR(line.service.salePrice)}
                    </span>
                    <span className="block text-2xs text-ink-muted sm:hidden">
                      pro Stk
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="num text-sm text-ink">
                      {formatEUR(line.totalSaleNet)}
                    </span>
                    <span className="block text-2xs text-ink-muted sm:hidden">
                      Netto
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="num text-sm font-semibold text-ink">
                      {formatEUR(line.totalSaleGross)}
                    </span>
                    <span className="block text-2xs text-ink-muted sm:hidden">
                      Brutto
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ─── Right: Totals ──────────────────────────── */}
        <aside className="flex flex-col gap-3">
          {/* Sale */}
          <section className="card overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <p className="eyebrow">Verkaufspreis</p>
            </div>
            <div className="space-y-2 px-5 py-4">
              <Row label="Netto" value={formatEUR(totals.totalSaleNet)} />
              <Row
                label={`MwSt ${(totals.vatRate * 100).toFixed(0).replace('.', ',')}%`}
                value={formatEUR(
                  totals.totalSaleGross - totals.totalSaleNet,
                )}
                muted
              />
              <div className="my-2 border-t border-dashed border-border" />
              <Row
                label="Brutto"
                value={formatEUR(totals.totalSaleGross)}
                strong
              />
            </div>
          </section>

          {/* Cost */}
          <section className="card overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <p className="eyebrow">Kosten</p>
            </div>
            <div className="space-y-2 px-5 py-4">
              <Row label="Netto" value={formatEUR(totals.totalCostNet)} muted />
              <Row
                label="Brutto"
                value={formatEUR(totals.totalCostGross)}
                muted
              />
            </div>
          </section>

          {/* Profit */}
          <section
            className={[
              'card overflow-hidden',
              totals.profitNet >= 0
                ? 'border-accent/40'
                : 'border-danger/40',
            ].join(' ')}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <p className="eyebrow flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                Gewinn
              </p>
              {totals.totalSaleNet > 0 && (
                <span className="badge-accent">
                  {formatPct(totals.profitMarginPct)}
                </span>
              )}
            </div>
            <div className="px-5 py-4">
              <p className="eyebrow">Gewinn (Netto)</p>
              <p
                className={[
                  'display-num mt-1 text-3xl font-bold leading-none',
                  totals.profitNet >= 0 ? 'text-accent-strong' : 'text-danger',
                ].join(' ')}
              >
                {formatEUR(totals.profitNet)}
              </p>
            </div>
          </section>

          {/* Hint */}
          <div className="rounded-2xl border border-dashed border-border bg-canvas/40 px-4 py-3 text-2xs text-ink-muted">
            <FileText className="mb-1 h-3.5 w-3.5" strokeWidth={1.6} />
            Tipp: Aktiviere &quot;Gewinn-Übersicht im PDF&quot; für interne
            Berichte. Für Kundenangebote besser deaktiviert lassen.
          </div>
        </aside>
      </div>
    </Modal>
  )
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={[
          'text-sm',
          muted ? 'text-ink-muted' : strong ? 'text-ink' : 'text-ink-soft',
        ].join(' ')}
      >
        {label}
      </span>
      <span
        className={[
          'num',
          strong
            ? 'text-base font-bold text-ink'
            : muted
              ? 'text-sm text-ink-muted'
              : 'text-sm font-medium text-ink',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}
