import { Trash2 } from 'lucide-react'
import { getItemName } from '../../lib/quoteCalc'
import { formatEUR, formatPriceInput } from '../../lib/format'
import type { QuoteItem } from '../../types'

interface ItemRowProps {
  item: QuoteItem
  onDelete: () => void
  onBlurQuantity: (val: string) => void
  onBlurPrice: (val: string) => void
  onBlurPurchasePrice?: (val: string) => void
  onSelect?: () => void
}

export function ItemRow({ item, onDelete, onBlurQuantity, onBlurPrice, onBlurPurchasePrice, onSelect }: ItemRowProps) {
  const name = getItemName(item)
  const lineTotal = item.quantity * item.unitPrice
  const purchasePrice = item.purchasePrice ?? item.service?.purchasePrice ?? 0
  const hasPurchasePriceOverride = item.purchasePrice !== undefined && item.purchasePrice !== (item.service?.purchasePrice ?? 0)

  return (
    <div
      onClick={() => onSelect?.()}
      className={[
        'card flex flex-col gap-3 p-4 transition-all sm:flex-row sm:items-center sm:gap-4',
        onSelect ? 'cursor-pointer hover:border-border-strong hover:shadow-soft' : '',
      ].join(' ')}
      role={onSelect ? 'button' : undefined}
      aria-label={onSelect ? `${name} Details bearbeiten` : undefined}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink truncate">{name}</p>
        {item.customNote && (
          <p className="text-2xs text-ink-muted truncate">{item.customNote}</p>
        )}
        {item.service && hasPurchasePriceOverride && (
          <p className="text-2xs text-accent" title="Einkaufspreis von Preisliste abweichend">
            EK abweichend
          </p>
        )}
      </div>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <label className="text-2xs font-medium text-ink-muted sm:hidden">Menge</label>
        <input
          type="text"
          inputMode="numeric"
          defaultValue={item.quantity}
          onBlur={(e) => onBlurQuantity(e.target.value)}
          className="input w-20 text-center num"
        />
      </div>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <label className="text-2xs font-medium text-ink-muted sm:hidden">Preis</label>
        <input
          type="text"
          inputMode="decimal"
          defaultValue={formatPriceInput(item.unitPrice)}
          onBlur={(e) => onBlurPrice(e.target.value)}
          className="input w-28 text-right num"
        />
      </div>

      {onBlurPurchasePrice && (
        <div className="hidden items-center gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            inputMode="decimal"
            defaultValue={formatPriceInput(purchasePrice)}
            onBlur={(e) => onBlurPurchasePrice(e.target.value)}
            className="input w-24 text-right num text-2xs"
            title="Einkaufspreis (netto)"
            placeholder="EK"
          />
        </div>
      )}

      <div className="num min-w-[80px] text-right text-sm font-semibold text-ink">
        {formatEUR(lineTotal)}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="qty-btn shrink-0 text-danger hover:bg-danger/10"
        title="Position entfernen"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
