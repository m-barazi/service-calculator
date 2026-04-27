import { useMemo, useState } from 'react'
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { ServiceFormModal } from '../components/ServiceFormModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatEUR, formatPct } from '../lib/format'
import type { Service } from '../types'

export function PriceListPage() {
  const { services, isLoading, deleteService, updateService } = useApp()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [editing, setEditing] = useState<Service | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Service | undefined>(
    undefined,
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink-muted border-t-ink"></div>
            <p className="mt-4 text-sm text-ink-soft">Lade Preisliste...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      await deleteService(id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    setIsUpdating(true)
    try {
      await updateService(id, { visible: !visible })
    } finally {
      setIsUpdating(false)
    }
  }

  const categories = useMemo(() => {
    const map = new Map<string, number>()
    services.forEach((s) => map.set(s.category, (map.get(s.category) ?? 0) + 1))
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
  }, [services])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services
      .filter((s) => {
        if (activeCategory && s.category !== activeCategory) return false
        if (!q) return true
        return (
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  }, [services, activeCategory, search])

  const totalRevenue = useMemo(
    () => services.reduce((s, x) => s + x.salePrice, 0),
    [services],
  )

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      {/* ─── Header ──────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Preisliste
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Verwalte alle Dienstleistungen mit Einkaufs- und Verkaufspreisen.
            Änderungen werden automatisch gespeichert.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Neue Leistung
        </button>
      </div>

      {/* ─── Stat cards ──────────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          eyebrow="Leistungen gesamt"
          value={services.length.toString()}
        />
        <StatCard
          eyebrow="Sichtbar im Rechner"
          value={services.filter((s) => s.visible).length.toString()}
        />
        <StatCard
          eyebrow="Kategorien"
          value={categories.length.toString()}
        />
      </div>

      {/* ─── Filter bar ──────────────────────────────── */}
      <div className="card mb-4 flex flex-col gap-3 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche…"
            className="input w-full pl-10"
          />
        </div>
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip
              label="Alle"
              count={services.length}
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {categories.map((c) => (
              <CategoryChip
                key={c.name}
                label={c.name}
                count={c.count}
                active={activeCategory === c.name}
                onClick={() =>
                  setActiveCategory(activeCategory === c.name ? null : c.name)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Desktop table ───────────────────────────── */}
      <div className="card hidden overflow-hidden md:block">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_120px_120px_110px_120px] gap-2 border-b border-border bg-canvas/40 px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-muted">
          <span>Name</span>
          <span>Kategorie</span>
          <span className="text-right">Einkauf (Netto)</span>
          <span className="text-right">Verkauf (Netto)</span>
          <span className="text-right">Marge</span>
          <span className="text-right">Aktionen</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((s) => {
            const profit = s.salePrice - s.purchasePrice
            const margin = s.salePrice > 0 ? profit / s.salePrice : 0

            return (
              <div
                key={s.id}
                className="group grid grid-cols-[2fr_1fr_120px_120px_110px_120px] gap-2 px-5 py-3.5 transition-colors hover:bg-elevated/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-ink truncate">
                      {s.name}
                    </span>
                    {s.note && (
                      <span className="text-2xs text-ink-muted truncate">
                        {s.note}
                      </span>
                    )}
                  </div>
                  {!s.visible && (
                    <span className="badge-neutral shrink-0">Versteckt</span>
                  )}
                </div>
                <div className="flex items-center text-sm text-ink-soft truncate">
                  {s.category}
                </div>
                <div className="flex items-center justify-end num text-sm text-ink">
                  {formatEUR(s.purchasePrice)}
                </div>
                <div className="flex items-center justify-end num text-sm font-medium text-ink">
                  {formatEUR(s.salePrice)}
                </div>
                <div className="flex items-center justify-end num text-sm">
                  <span
                    className={
                      margin >= 0 ? 'text-accent-strong' : 'text-danger'
                    }
                  >
                    {formatPct(margin)}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => handleToggleVisibility(s.id, s.visible)}
                    className="qty-btn"
                    disabled={isUpdating}
                    title={
                      s.visible ? 'Im Rechner ausblenden' : 'Im Rechner anzeigen'
                    }
                  >
                    {s.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditing(s)}
                    className="qty-btn"
                    title="Bearbeiten"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(s)}
                    className="qty-btn text-danger hover:bg-danger/10"
                    title="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Mobile cards ────────────────────────────── */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {filtered.map((s) => {
          const profit = s.salePrice - s.purchasePrice
          const margin = s.salePrice > 0 ? profit / s.salePrice : 0

          return (
            <div
              key={s.id}
              className="card flex flex-col gap-3 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink truncate">
                    {s.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="badge-neutral">{s.category}</span>
                    {!s.visible && (
                      <span className="badge-neutral">Versteckt</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => setEditing(s)}
                    className="qty-btn"
                    aria-label="Bearbeiten"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(s)}
                    className="qty-btn text-danger"
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-canvas/40 p-3">
                <div>
                  <p className="text-2xs uppercase tracking-wider text-ink-muted">
                    Einkauf
                  </p>
                  <p className="num mt-0.5 text-sm font-medium">
                    {formatEUR(s.purchasePrice)}
                  </p>
                </div>
                <div>
                  <p className="text-2xs uppercase tracking-wider text-ink-muted">
                    Verkauf
                  </p>
                  <p className="num mt-0.5 text-sm font-semibold">
                    {formatEUR(s.salePrice)}
                  </p>
                </div>
                <div>
                  <p className="text-2xs uppercase tracking-wider text-ink-muted">
                    Marge
                  </p>
                  <p
                    className={[
                      'num mt-0.5 text-sm font-medium',
                      margin >= 0 ? 'text-accent-strong' : 'text-danger',
                    ].join(' ')}
                  >
                    {formatPct(margin)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <TrendingUp
            className="h-8 w-8 text-ink-muted"
            strokeWidth={1.5}
          />
          <p className="mt-2 text-sm font-medium text-ink">
            Keine Leistungen gefunden
          </p>
          <p className="text-2xs text-ink-muted">
            {search
              ? 'Passe deine Suche an oder erstelle eine neue Leistung.'
              : 'Beginne mit deiner ersten Dienstleistung.'}
          </p>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary mt-3"
          >
            <Plus className="h-4 w-4" />
            Erste Leistung anlegen
          </button>
        </div>
      )}

      {/* Modals */}
      <ServiceFormModal
        open={creating}
        onClose={() => setCreating(false)}
      />
      <ServiceFormModal
        open={!!editing}
        onClose={() => setEditing(undefined)}
        service={editing}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(undefined)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
        title="Leistung löschen?"
        description={`"${confirmDelete?.name}" wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel={isDeleting ? 'Löschen...' : 'Löschen'}
        variant="danger"
        disabled={isDeleting}
      />

      {/* Suppress unused variable lint */}
      <span className="hidden">{totalRevenue}</span>
    </div>
  )
}

function StatCard({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <p className="eyebrow">{eyebrow}</p>
      <p className="num display-num text-2xl font-bold leading-none text-ink">
        {value}
      </p>
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
