import { useState } from 'react'
import { ExternalLink, FileText, Pin, RotateCcw, StickyNote } from 'lucide-react'
import type { Service } from '../types'
import { formatEUR, formatPriceInput, parseGermanNumber } from '../lib/format'
import { QuantityStepper } from './QuantityStepper'

interface ServiceRowProps {
  service: Service
  quantity: number
  unitPrice?: number
  onChangeQuantity: (q: number) => void
  onChangeUnitPrice?: (unitPrice: number | undefined) => void
  showPrices: boolean
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
  note?: string
  onChangeNote?: (note: string) => void
  onSelect?: () => void
}

export function ServiceRow({
  service,
  quantity,
  unitPrice,
  onChangeQuantity,
  onChangeUnitPrice,
  showPrices,
  categoryName,
  categoryColor,
  categoryIcon,
  note,
  onChangeNote,
  onSelect,
}: ServiceRowProps) {
  const [showNote, setShowNote] = useState(false)
  const [priceInput, setPriceInput] = useState(formatPriceInput(unitPrice ?? service.salePrice))
  const isActive = quantity > 0
  const effectivePrice = unitPrice ?? service.salePrice
  const lineTotal = effectivePrice * quantity
  const isPriceOverridden = unitPrice !== undefined && unitPrice !== service.salePrice

  const handlePriceBlur = () => {
    const parsed = parseGermanNumber(priceInput)
    if (!parsed || parsed === service.salePrice) {
      onChangeUnitPrice?.(undefined)
      setPriceInput(formatPriceInput(service.salePrice))
      return
    }
    onChangeUnitPrice?.(parsed)
    setPriceInput(formatPriceInput(parsed))
  }

  const resetPrice = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChangeUnitPrice?.(undefined)
    setPriceInput(formatPriceInput(service.salePrice))
  }

  return (
    <div
      onClick={() => onSelect?.()}
      className={[
        'group relative flex flex-col gap-3 rounded-2xl border bg-surface px-4 py-4 transition-all sm:flex-row sm:items-center sm:gap-4 sm:px-5',
        onSelect ? 'cursor-pointer' : '',
        isActive
          ? 'border-accent/40 shadow-[0_1px_0_0_rgb(0_0_0_/_0.02),0_8px_24px_-12px_rgb(var(--accent)_/_0.35)]'
          : 'border-border hover:border-border-strong hover:shadow-soft',
      ].join(' ')}
      role={onSelect ? 'button' : undefined}
      aria-label={onSelect ? `${service.name} Details anzeigen` : undefined}
    >
      {/* Active indicator dot */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 hidden h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-accent sm:block"
          aria-hidden
        />
      )}

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">
            {service.name}
          </h3>
          {service.pinned && (
            <span className="text-accent" title="Gepinnte Leistung">
              <Pin className="h-3.5 w-3.5 fill-current" />
            </span>
          )}
          {service.url && (
            <a
              href={service.url}
              target="_blank"
              rel="noreferrer"
              className="text-ink-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
              aria-label="Quelle öffnen"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap text-2xs">
          <span
            className="badge-neutral"
            style={categoryColor ? { backgroundColor: categoryColor + '20', color: categoryColor, borderColor: categoryColor + '40' } : undefined}
          >
            {categoryIcon ? `${categoryIcon} ` : ''}{categoryName ?? service.categoryId ?? 'Ohne Kategorie'}
          </span>
          {service.note && (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <FileText className="h-3 w-3" />
              <span className="line-clamp-1">{service.note}</span>
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      {showPrices && onChangeUnitPrice && (
        <div
          className="flex flex-col items-start sm:items-end sm:min-w-[120px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-ink-muted">
              Preis / Stk
            </span>
            {isPriceOverridden && (
              <span
                className="inline-flex h-2 w-2 rounded-full bg-accent"
                title="Von Preisliste abweichender Preis"
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={handlePriceBlur}
              className={[
                'input w-24 text-right num text-sm py-1',
                isPriceOverridden ? 'border-accent/50 text-accent-strong' : '',
              ].join(' ')}
            />
            {isPriceOverridden && (
              <button
                onClick={resetPrice}
                className="qty-btn text-ink-muted"
                title="Auf Preislistenpreis zurücksetzen"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
      {showPrices && !onChangeUnitPrice && (
        <div className="flex flex-col items-start sm:items-end sm:min-w-[120px]">
          <span className="text-2xs uppercase tracking-wider text-ink-muted">
            Preis / Stk
          </span>
          <span className="num text-sm font-semibold text-ink">
            {formatEUR(effectivePrice)}
          </span>
        </div>
      )}

      {/* Stepper + total */}
      <div
        className="flex items-center justify-between gap-3 sm:justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <QuantityStepper value={quantity} onChange={onChangeQuantity} />
        <div className="flex flex-col items-end min-w-[100px]">
          <span className="text-2xs uppercase tracking-wider text-ink-muted">
            Summe
          </span>
          <span
            className={[
              'num text-sm font-semibold',
              isActive ? 'text-accent-strong' : 'text-ink-muted',
            ].join(' ')}
          >
            {formatEUR(lineTotal)}
          </span>
        </div>
      </div>

      {/* Note toggle + inline field */}
      {(showNote || note) ? (
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowNote(!showNote)}
            className={[
              'qty-btn shrink-0',
              note ? 'text-accent' : 'text-ink-muted',
            ].join(' ')}
            title={note ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
          <input
            type="text"
            value={note ?? ''}
            onChange={(e) => onChangeNote?.(e.target.value)}
            placeholder="z.B. für mustermax.de"
            maxLength={100}
            className="input flex-1 text-sm"
          />
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowNote(true)
          }}
          className="qty-btn text-ink-muted"
          title="Notiz hinzufügen"
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
