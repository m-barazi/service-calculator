import { useMemo, useState } from 'react'
import { Eye, EyeOff, Search, X } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { computeCart } from '../lib/calc'
import { ServiceRow } from '../components/ServiceRow'
import { SummaryPanel } from '../components/SummaryPanel'
import { DetailsModal } from '../components/DetailsModal'
import { formatEUR } from '../lib/format'

export function CalculatorPage() {
  const {
    services,
    cart,
    setQuantity,
    setNote,
    clearCart,
    settings,
    cartLineCount,
    categories: allCategories,
  } = useApp()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showPrices, setShowPrices] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Visible services first, then by category
  const visibleServices = useMemo(
    () => services.filter((s) => s.visible),
    [services],
  )

  const categoryMap = useMemo(() => {
    const map = new Map<string, number>()
    visibleServices.forEach((s) => {
      const catId = s.categoryId ?? ''
      map.set(catId, (map.get(catId) ?? 0) + 1)
    })
    return map
  }, [visibleServices])

  const displayCategories = useMemo(
    () =>
      allCategories
        .filter((c) => c.visible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({ ...c, count: categoryMap.get(c.id) ?? 0 }))
        .filter((c) => c.count > 0),
    [allCategories, categoryMap],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visibleServices.filter((s) => {
      if (activeCategory && s.categoryId !== activeCategory) return false
      if (!q) return true
      const catName = allCategories.find(c => c.id === s.categoryId)?.name ?? s.categoryId ?? ''
      return (
        s.name.toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q) ||
        (s.note?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [visibleServices, activeCategory, search])

  // Totals
  const cartItems = useMemo(
    () =>
      Object.entries(cart).map(([serviceId, entry]) => ({
        serviceId,
        quantity: entry.quantity,
        note: entry.note,
      })),
    [cart],
  )
  const totals = useMemo(
    () => computeCart(cartItems, services, settings.vatRate),
    [cartItems, services, settings.vatRate],
  )

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      {/* ─── Page header ─────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-1">
        <p className="eyebrow">Kostenrechner</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Leistungen{' '}
          <span className="text-ink-muted">auswählen</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Wähle die gewünschten Dienstleistungen, passe die Anzahl an und sieh
          die Live-Berechnung der Gesamtkosten.
        </p>
      </div>

      {/* ─── Layout grid ─────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: Service list */}
        <div className="flex flex-col gap-4">
          {/* Search + filters */}
          <div className="card flex flex-col gap-3 p-3">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suche nach Leistungen…"
                  className="input w-full pl-10 pr-9"
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
              {/* Toggle prices */}
              <button
                onClick={() => setShowPrices((v) => !v)}
                className="btn-ghost shrink-0"
                title={showPrices ? 'Preise ausblenden' : 'Preise anzeigen'}
              >
                {showPrices ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {showPrices ? 'Preise' : 'Versteckt'}
                </span>
              </button>
            </div>

            {/* Categories */}
            {displayCategories.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <CategoryChip
                  label="Alle"
                  count={visibleServices.length}
                  active={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                />
                {displayCategories.map((c) => (
                  <CategoryChip
                    key={c.id}
                    label={c.icon ? `${c.icon} ${c.name}` : c.name}
                    count={c.count}
                    active={activeCategory === c.id}
                    onClick={() =>
                      setActiveCategory(
                        activeCategory === c.id ? null : c.id,
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Service rows — grouped by category */}
          {filtered.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
              <p className="text-sm font-medium text-ink">
                Keine Leistungen gefunden
              </p>
              <p className="text-2xs text-ink-muted">
                Passe die Suche oder Kategorie an, oder füge eine neue
                Leistung in der Preisliste hinzu.
              </p>
            </div>
          ) : (
            <div className="stagger flex flex-col gap-4">
              {displayCategories.map((cat) => {
                const catServices = filtered.filter(
                  (s) => s.categoryId === cat.id,
                )
                if (catServices.length === 0) return null
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      {cat.icon && (
                        <span className="text-lg">{cat.icon}</span>
                      )}
                      <h2 className="text-sm font-semibold text-ink">
                        {cat.name}
                      </h2>
                      {cat.color && (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                      <span className="text-2xs text-ink-muted">
                        ({catServices.length})
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {catServices.map((s) => (
                        <ServiceRow
                          key={s.id}
                          service={s}
                          quantity={cart[s.id]?.quantity ?? 0}
                          onChangeQuantity={(q) => setQuantity(s.id, q)}
                          showPrices={showPrices}
                          categoryName={cat.name}
                          categoryColor={cat.color}
                          categoryIcon={cat.icon}
                          note={cart[s.id]?.note ?? ''}
                          onChangeNote={(note) => setNote(s.id, note)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom hint */}
          {visibleServices.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-base font-semibold text-ink">
                Noch keine Leistungen
              </p>
              <p className="mt-1.5 text-sm text-ink-muted">
                Füge unter "Preisliste" deine erste Dienstleistung hinzu.
              </p>
            </div>
          )}
        </div>

        {/* Right: Sticky summary (desktop) */}
        <div className="hidden lg:block">
          <SummaryPanel
            totals={totals}
            onShowDetails={() => setDetailsOpen(true)}
            onClear={clearCart}
          />
        </div>
      </div>

      {/* ─── Mobile sticky bottom summary ───────────────── */}
      {cartLineCount > 0 && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 px-4 pb-3 lg:hidden">
          <button
            onClick={() => setDetailsOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-ink px-5 py-3.5 text-canvas shadow-elevated transition-all active:scale-[0.99]"
          >
            <div className="flex flex-col items-start">
              <span className="text-2xs uppercase tracking-wider opacity-60">
                {cartLineCount} Position{cartLineCount === 1 ? '' : 'en'} ·{' '}
                {totals.itemCount} Stück
              </span>
              <span className="num text-lg font-bold">
                {formatEUR(totals.totalSaleGross)}
              </span>
            </div>
            <span className="rounded-xl bg-canvas/10 px-3 py-2 text-xs font-semibold backdrop-blur">
              Details &amp; PDF
            </span>
          </button>
        </div>
      )}

      <DetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        totals={totals}
        settings={settings}
      />
    </div>
  )
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-ink bg-ink text-canvas'
          : 'border-border bg-surface text-ink-soft hover:border-border-strong hover:text-ink',
      ].join(' ')}
    >
      {label}
      <span
        className={[
          'num rounded-full px-1.5 py-0.5 text-2xs',
          active ? 'bg-canvas/15' : 'bg-elevated text-ink-muted',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  )
}
