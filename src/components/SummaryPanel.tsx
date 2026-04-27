import { ReceiptText, Sparkles, Trash2 } from 'lucide-react'
import type { CartTotals } from '../types'
import { formatEUR, formatPct } from '../lib/format'

interface SummaryPanelProps {
  totals: CartTotals
  onShowDetails: () => void
  onClear: () => void
}

export function SummaryPanel({ totals, onShowDetails, onClear }: SummaryPanelProps) {
  const isEmpty = totals.lines.length === 0

  return (
    <aside className="card sticky top-24 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow">Zusammenfassung</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight">
            Live-Übersicht
          </h2>
        </div>
        <span className="badge-accent">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Live
        </span>
      </div>

      {/* Numbers */}
      <div className="flex flex-col gap-1 px-5 py-5">
        <p className="eyebrow">Verkaufspreis Brutto</p>
        <p className="display-num text-[44px] font-bold leading-none tracking-tightest text-ink">
          {formatEUR(totals.totalSaleGross)}
        </p>
        <p className="num mt-2 text-sm text-ink-muted">
          {formatEUR(totals.totalSaleNet)} netto
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
        <div className="bg-surface px-5 py-4">
          <p className="eyebrow">Positionen</p>
          <p className="num mt-1 text-lg font-semibold text-ink">
            {totals.lines.length}
          </p>
        </div>
        <div className="bg-surface px-5 py-4">
          <p className="eyebrow">Stückzahl</p>
          <p className="num mt-1 text-lg font-semibold text-ink">
            {totals.itemCount}
          </p>
        </div>
        <div className="bg-surface px-5 py-4">
          <p className="eyebrow">Kosten Netto</p>
          <p className="num mt-1 text-base font-medium text-ink-soft">
            {formatEUR(totals.totalCostNet)}
          </p>
        </div>
        <div className="bg-surface px-5 py-4">
          <p className="eyebrow">Gewinn</p>
          <p
            className={[
              'num mt-1 text-base font-semibold',
              totals.profitNet >= 0 ? 'text-accent-strong' : 'text-danger',
            ].join(' ')}
          >
            {formatEUR(totals.profitNet)}
          </p>
          {totals.totalSaleNet > 0 && (
            <p className="num mt-0.5 text-2xs text-ink-muted">
              {formatPct(totals.profitMarginPct)} Marge
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t border-border p-4">
        <button
          onClick={onShowDetails}
          disabled={isEmpty}
          className="btn-primary w-full"
        >
          <Sparkles className="h-4 w-4" />
          Details &amp; PDF
        </button>
        <button
          onClick={onClear}
          disabled={isEmpty}
          className="btn-ghost w-full text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Auswahl zurücksetzen
        </button>
      </div>

      {/* Empty hint */}
      {isEmpty && (
        <div className="border-t border-border bg-elevated/40 px-5 py-3 text-center text-xs text-ink-muted">
          <ReceiptText className="mx-auto mb-1 h-4 w-4" strokeWidth={1.6} />
          Wähle Leistungen für eine Live-Berechnung
        </div>
      )}
    </aside>
  )
}
