import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Copy,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { usePagedList } from '../hooks/usePagedList'
import { fetchServicesPage, fetchServiceStats } from '../lib/api'
import { ServiceFormModal } from '../components/ServiceFormModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'
import { formatEUR, formatPct } from '../lib/format'
import type { Service, ServiceStats } from '../types'

const PAGE_SIZE = 12

export function PriceListPage() {
  const { isLoading: isLoadingApp, deleteService, updateService, categories: allCategories } = useApp()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [editing, setEditing] = useState<Service | undefined>(undefined)
  const [cloning, setCloning] = useState<Service | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Service | undefined>(
    undefined,
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [stats, setStats] = useState<ServiceStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  const fetchPage = useCallback(
    (page: number, limit: number) =>
      fetchServicesPage({ page, limit, search, categoryId: activeCategory ?? undefined }),
    [search, activeCategory],
  )

  const {
    data: services,
    pagination,
    isLoading: isLoadingServices,
    loadPage,
    refresh,
  } = usePagedList<Service>({ fetchPage, limit: PAGE_SIZE })

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      setStats(await fetchServiceStats())
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const isLoading = isLoadingApp || isLoadingServices || isLoadingStats

  if (isLoading && services.length === 0 && !stats) {
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
      await refresh()
      await loadStats()
    } finally {
      setIsDeleting(false)
      setConfirmDelete(undefined)
    }
  }

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    setIsUpdating(true)
    try {
      await updateService(id, { visible: !visible })
      await refresh()
      await loadStats()
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTogglePinned = async (id: string, pinned: boolean) => {
    setIsUpdating(true)
    try {
      await updateService(id, { pinned: !pinned })
      await refresh()
    } finally {
      setIsUpdating(false)
    }
  }

  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>()
    stats?.categoryCounts.forEach((c) => map.set(c.categoryId, c.count))
    return map
  }, [stats])

  const displayCategories = useMemo(() => {
    return allCategories
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ ...c, count: categoryCountMap.get(c.id) ?? 0 }))
  }, [allCategories, categoryCountMap])

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
          value={stats?.totalCount.toString() ?? '—'}
        />
        <StatCard
          eyebrow="Sichtbar im Rechner"
          value={stats?.visibleCount.toString() ?? '—'}
        />
        <StatCard
          eyebrow="Kategorien"
          value={displayCategories.length.toString()}
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
        {displayCategories.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip
              label="Alle"
              count={stats?.totalCount ?? 0}
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
                  setActiveCategory(activeCategory === c.id ? null : c.id)
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
          {services.map((s) => {
            const profit = s.salePrice - s.purchasePrice
            const margin = s.salePrice > 0 ? profit / s.salePrice : 0
            const categoryName = allCategories.find(c => c.id === s.categoryId)?.name ?? s.categoryId ?? ''

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
                  {s.pinned && (
                    <span className="badge-accent shrink-0">Gepinnt</span>
                  )}
                </div>
                <div className="flex items-center text-sm text-ink-soft truncate">
                  {categoryName}
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
                    onClick={() => handleTogglePinned(s.id, s.pinned)}
                    className={['qty-btn', s.pinned ? 'text-accent' : ''].filter(Boolean).join(' ')}
                    disabled={isUpdating}
                    title={s.pinned ? 'Pin entfernen' : 'Anpinnen'}
                  >
                    {s.pinned ? (
                      <Pin className="h-4 w-4 fill-current" />
                    ) : (
                      <PinOff className="h-4 w-4" />
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
                    onClick={() => setCloning(s)}
                    className="qty-btn"
                    title="Klonen"
                  >
                    <Copy className="h-3.5 w-3.5" />
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
        {services.map((s) => {
          const profit = s.salePrice - s.purchasePrice
          const margin = s.salePrice > 0 ? profit / s.salePrice : 0
          const categoryName = allCategories.find(c => c.id === s.categoryId)?.name ?? s.categoryId ?? ''

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
                    <span className="badge-neutral">{categoryName}</span>
                    {!s.visible && (
                      <span className="badge-neutral">Versteckt</span>
                    )}
                    {s.pinned && (
                      <span className="badge-accent">Gepinnt</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => handleTogglePinned(s.id, s.pinned)}
                    className={['qty-btn', s.pinned ? 'text-accent' : ''].filter(Boolean).join(' ')}
                    disabled={isUpdating}
                    aria-label={s.pinned ? 'Pin entfernen' : 'Anpinnen'}
                  >
                    {s.pinned ? (
                      <Pin className="h-4 w-4 fill-current" />
                    ) : (
                      <PinOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditing(s)}
                    className="qty-btn"
                    aria-label="Bearbeiten"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCloning(s)}
                    className="qty-btn"
                    aria-label="Klonen"
                  >
                    <Copy className="h-3.5 w-3.5" />
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
      {services.length === 0 && (
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

      {services.length > 0 && (
        <div className="mt-6">
          <Pagination pagination={pagination} onPageChange={loadPage} />
        </div>
      )}

      {/* Modals */}
      <ServiceFormModal
        open={creating}
        onClose={() => {
          setCreating(false)
          refresh()
          loadStats()
        }}
      />
      <ServiceFormModal
        open={!!editing}
        onClose={() => {
          setEditing(undefined)
          refresh()
          loadStats()
        }}
        service={editing}
      />
      <ServiceFormModal
        open={!!cloning}
        onClose={() => {
          setCloning(undefined)
          refresh()
          loadStats()
        }}
        cloneFrom={cloning}
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

export default PriceListPage
