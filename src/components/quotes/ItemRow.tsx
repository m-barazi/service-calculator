import { Trash2 } from 'lucide-react'
import { getItemName } from '../../lib/quoteCalc'
import { formatEUR, formatPriceInput } from '../../lib/format'
import type { QuoteItem } from '../../types'

interface ItemRowProps {
  item: QuoteItem
  onDelete: () => void
  onBlurQuantity: (val: string) => void
  onBlurPrice: (val: string) => void
}

export function ItemRow({ item, onDelete, onBlurQuantity, onBlurPrice }: ItemRowProps) {
  const name = getItemName(item)
  const lineTotal = item.quantity * item.unitPrice

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink truncate">{name}</p>
        {item.customNote && (
          <p className="text-2xs text-ink-muted truncate">{item.customNote}</p>
        )}
      </div>

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

      <div className="num min-w-[80px] text-right text-sm font-semibold text-ink">
        {formatEUR(lineTotal)}
      </div>

      <button
        onClick={onDelete}
        className="qty-btn shrink-0 text-danger hover:bg-danger/10"
        title="Position entfernen"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
