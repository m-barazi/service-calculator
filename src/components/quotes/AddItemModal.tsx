import { Plus, Search, X } from 'lucide-react'
import { Modal } from '../Modal'
import { formatEUR, parseGermanNumber } from '../../lib/format'
import type { Category, Service } from '../../types'

interface AddItemModalProps {
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
}

export function AddItemModal({
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
}: AddItemModalProps) {
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
                        <span className="text-sm font-medium text-ink truncate">{s.name}</span>
                        <span className="num shrink-0 text-sm text-ink-soft">{formatEUR(s.salePrice)}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {servicesByCategory.size === 0 && (
              <p className="py-4 text-center text-sm text-ink-muted">Keine Leistungen gefunden</p>
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
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Bezeichnung</span>
              <input
                type="text"
                value={freeName}
                onChange={(e) => onFreeNameChange(e.target.value)}
                className="input"
                placeholder="z.B. Sonderleistung"
              />
            </label>
            <label className="w-full sm:w-36">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Preis (€)</span>
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
              disabled={!freeName.trim() || parseGermanNumber(freePrice) <= 0}
              className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
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
