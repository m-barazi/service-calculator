import { ExternalLink, FileText } from 'lucide-react'
import type { Service } from '../types'
import { formatEUR } from '../lib/format'
import { QuantityStepper } from './QuantityStepper'

interface ServiceRowProps {
  service: Service
  quantity: number
  onChangeQuantity: (q: number) => void
  showPrices: boolean
}

export function ServiceRow({
  service,
  quantity,
  onChangeQuantity,
  showPrices,
}: ServiceRowProps) {
  const isActive = quantity > 0
  const lineTotal = service.salePrice * quantity

  return (
    <div
      className={[
        'group relative flex flex-col gap-3 rounded-2xl border bg-surface px-4 py-4 transition-all sm:flex-row sm:items-center sm:gap-4 sm:px-5',
        isActive
          ? 'border-accent/40 shadow-[0_1px_0_0_rgb(0_0_0_/_0.02),0_8px_24px_-12px_rgb(var(--accent)_/_0.35)]'
          : 'border-border hover:border-border-strong hover:shadow-soft',
      ].join(' ')}
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
          <span className="badge-neutral">{service.category}</span>
          {service.note && (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <FileText className="h-3 w-3" />
              <span className="line-clamp-1">{service.note}</span>
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      {showPrices && (
        <div className="flex flex-col items-start sm:items-end sm:min-w-[120px]">
          <span className="text-2xs uppercase tracking-wider text-ink-muted">
            Preis / Stk
          </span>
          <span className="num text-sm font-semibold text-ink">
            {formatEUR(service.salePrice)}
          </span>
        </div>
      )}

      {/* Stepper + total */}
      <div className="flex items-center justify-between gap-3 sm:justify-end">
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
    </div>
  )
}
