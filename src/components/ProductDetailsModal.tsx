import { ExternalLink, Pin, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import { QuantityStepper } from './QuantityStepper'
import { computeLine } from '../lib/calc'
import { formatEUR, formatPct, formatPriceInput, parseGermanNumber } from '../lib/format'
import type { Service } from '../types'

interface ProductDetailsModalProps {
  open: boolean
  onClose: () => void
  service: Service
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
  quantity: number
  note: string
  unitPrice?: number
  vatRate: number
  onChangeQuantity: (q: number) => void
  onChangeNote: (note: string) => void
  onChangeUnitPrice?: (unitPrice: number | undefined) => void
}

export function ProductDetailsModal({
  open,
  onClose,
  service,
  categoryName,
  categoryColor,
  categoryIcon,
  quantity,
  note,
  unitPrice,
  vatRate,
  onChangeQuantity,
  onChangeNote,
  onChangeUnitPrice,
}: ProductDetailsModalProps) {
  const effectivePrice = unitPrice ?? service.salePrice
  const line = useMemo(
    () => computeLine(service, quantity, vatRate, unitPrice),
    [service, quantity, vatRate, unitPrice],
  )

  const profitPerUnit = effectivePrice - service.purchasePrice
  const marginPerUnit = effectivePrice > 0 ? profitPerUnit / effectivePrice : 0
  const isPriceOverridden = unitPrice !== undefined && unitPrice !== service.salePrice
  const [priceInput, setPriceInput] = useState(formatPriceInput(unitPrice ?? service.salePrice))

  useEffect(() => {
    setPriceInput(formatPriceInput(unitPrice ?? service.salePrice))
  }, [unitPrice, service.salePrice])

  const handlePriceBlur = () => {
    const raw = priceInput.trim()
    if (raw === '') {
      onChangeUnitPrice?.(undefined)
      setPriceInput(formatPriceInput(service.salePrice))
      return
    }
    const parsed = parseGermanNumber(raw)
    if (parsed === service.salePrice) {
      onChangeUnitPrice?.(undefined)
      setPriceInput(formatPriceInput(service.salePrice))
      return
    }
    onChangeUnitPrice?.(parsed)
    setPriceInput(formatPriceInput(parsed))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service.name}
      description="Produkt-Details & Berechnung"
      size="lg"
      footer={
        <button onClick={onClose} className="btn-secondary">
          <X className="h-4 w-4" />
          Schließen
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Category + pinned */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="badge-neutral"
            style={
              categoryColor
                ? {
                    backgroundColor: categoryColor + '20',
                    color: categoryColor,
                    borderColor: categoryColor + '40',
                  }
                : undefined
            }
          >
            {categoryIcon ? `${categoryIcon} ` : ''}
            {categoryName ?? service.categoryId ?? 'Ohne Kategorie'}
          </span>
          {service.pinned && (
            <span className="inline-flex items-center gap-1 text-2xs text-accent" title="Gepinnte Leistung">
              <Pin className="h-3 w-3 fill-current" />
              Gepinnt
            </span>
          )}
          {service.url && (
            <a
              href={service.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-2xs text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              Quelle öffnen
            </a>
          )}
        </div>

        {/* Note */}
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
            Notiz
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => onChangeNote(e.target.value)}
            placeholder="z. B. für mustermax.de"
            maxLength={100}
            className="input text-sm"
          />
        </label>

        {/* Per-unit prices */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="eyebrow">Preise pro Stück</p>
            {isPriceOverridden && (
              <button
                onClick={() => {
                  onChangeUnitPrice?.(undefined)
                  setPriceInput(formatPriceInput(service.salePrice))
                }}
                className="inline-flex items-center gap-1 text-2xs font-medium text-ink-muted transition hover:text-ink"
              >
                <RotateCcw className="h-3 w-3" />
                Auf Preisliste zurücksetzen
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
            <Value label="Einkauf (netto)" value={formatEUR(service.purchasePrice)} />
            {onChangeUnitPrice ? (
              <label className="flex flex-col gap-1">
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
                  Verkauf (netto)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onBlur={handlePriceBlur}
                  className={[
                    'input w-full text-sm num py-1',
                    isPriceOverridden ? 'border-accent/50 text-accent-strong' : '',
                  ].join(' ')}
                />
              </label>
            ) : (
              <Value label="Verkauf (netto)" value={formatEUR(effectivePrice)} />
            )}
            <Value
              label="Gewinn / Stück"
              value={formatEUR(profitPerUnit)}
              accent={profitPerUnit >= 0}
              danger={profitPerUnit < 0}
            />
            <Value
              label="Marge"
              value={formatPct(marginPerUnit)}
              accent={profitPerUnit >= 0}
              danger={profitPerUnit < 0}
            />
          </div>
        </section>

        {/* Quantity */}
        <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Menge</p>
            <p className="text-sm text-ink-soft">Passe die Stückzahl an</p>
          </div>
          <QuantityStepper value={quantity} onChange={onChangeQuantity} />
        </section>

        {/* Totals */}
        <section className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <p className="eyebrow">Berechnung für {quantity} Stück</p>
          </div>
          <div className="grid gap-1 px-5 py-4">
            <Row label="Gesamtkosten (netto)" value={formatEUR(line.totalCostNet)} />
            <Row label="Gesamtkosten (brutto)" value={formatEUR(line.totalCostGross)} />
            <Row label="Gesamt-Verkauf (netto)" value={formatEUR(line.totalSaleNet)} />
            <Row label={`Gesamt-Verkauf (brutto, ${(vatRate * 100).toFixed(0).replace('.', ',')}% MwSt)`} value={formatEUR(line.totalSaleGross)} />
            <div className="my-2 border-t border-dashed border-border" />
            <Row
              label="Gewinn (netto)"
              value={formatEUR(line.profitNet)}
              strong
              accent={line.profitNet >= 0}
              danger={line.profitNet < 0}
            />
            <Row
              label="Gewinnmarge"
              value={formatPct(line.profitMarginPct)}
              accent={line.profitNet >= 0}
              danger={line.profitNet < 0}
            />
          </div>
        </section>
      </div>
    </Modal>
  )
}

function Row({
  label,
  value,
  strong,
  accent,
  danger,
}: {
  label: string
  value: string
  strong?: boolean
  accent?: boolean
  danger?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={[
          'text-sm',
          strong ? 'font-medium text-ink' : 'text-ink-soft',
        ].join(' ')}
      >
        {label}
      </span>
      <span
        className={[
          'num text-sm',
          strong ? 'font-semibold' : '',
          accent ? 'text-accent-strong' : '',
          danger ? 'text-danger' : '',
          !accent && !danger ? 'text-ink' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

function Value({
  label,
  value,
  accent,
  danger,
}: {
  label: string
  value: string
  accent?: boolean
  danger?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xs font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <span
        className={[
          'num text-base font-semibold',
          accent ? 'text-accent-strong' : '',
          danger ? 'text-danger' : '',
          !accent && !danger ? 'text-ink' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}
