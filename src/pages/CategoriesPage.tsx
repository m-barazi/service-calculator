import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Trash2,
  Layers,
} from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { CategoryFormModal } from '../components/CategoryFormModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Category } from '../types'

export function CategoriesPage() {
  const { categories, isLoadingCategories, updateCategory, deleteCategory } = useApp()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Category | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Category | undefined>(undefined)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (isLoadingCategories) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink-muted border-t-ink"></div>
            <p className="mt-4 text-sm text-ink-soft">Lade Kategorien...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteCategory(id)
    } catch (error: any) {
      const msg = error?.response?.data?.error ?? error?.message ?? ''
      if (error?.response?.status === 409 || msg.includes('Constraint') || msg.includes('conflict')) {
        setDeleteError(msg || 'Kategorie wird noch von Services verwendet.')
      } else {
        setDeleteError('Löschen fehlgeschlagen. Bitte versuche erneut.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    await updateCategory(id, { visible: !visible })
  }

  const handleMoveSortOrder = async (category: Category, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    const currentIndex = sorted.findIndex((c) => c.id === category.id)
    if (currentIndex === -1) return

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const swapCategory = sorted[swapIndex]
    // Swap sort orders
    await Promise.all([
      updateCategory(category.id, { sortOrder: swapCategory.sortOrder }),
      updateCategory(swapCategory.id, { sortOrder: category.sortOrder }),
    ])
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories
      .filter((c) => {
        if (!q) return true
        return (
          c.name.toLowerCase().includes(q) ||
          (c.description ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }, [categories, search])

  const visibleCount = categories.filter((c) => c.visible).length

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      {/* ─── Header ──────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Kategorien
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Verwalte Kategorien für deine Dienstleistungen. Bestimme Reihenfolge, Farben und Sichtbarkeit.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Neue Kategorie
        </button>
      </div>

      {/* ─── Stat cards ──────────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <StatCard eyebrow="Kategorien gesamt" value={categories.length.toString()} />
        <StatCard eyebrow="Sichtbar" value={visibleCount.toString()} />
      </div>

      {/* ─── Error banner ────────────────────────────── */}
      {deleteError && (
        <div className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger flex items-center justify-between">
          <span>{deleteError}</span>
          <button
            onClick={() => setDeleteError(null)}
            className="ml-3 text-danger hover:text-danger/80 font-medium"
          >
            Schließen
          </button>
        </div>
      )}

      {/* ─── Filter bar ──────────────────────────────── */}
      <div className="card mb-4 flex flex-col gap-3 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name oder Beschreibung…"
            className="input w-full pl-10"
          />
        </div>
      </div>

      {/* ─── Desktop table ───────────────────────────── */}
      <div className="card hidden overflow-hidden md:block">
        {/* Header row */}
        <div className="grid grid-cols-[auto_2fr_1fr_80px_80px_80px_100px] gap-2 border-b border-border bg-canvas/40 px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-muted">
          <span></span>
          <span>Name</span>
          <span>Beschreibung</span>
          <span>Farbe</span>
          <span className="text-center">Reihe</span>
          <span className="text-center">Sichtbar</span>
          <span className="text-right">Aktionen</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group grid grid-cols-[auto_2fr_1fr_80px_80px_80px_100px] gap-2 px-5 py-3.5 transition-colors hover:bg-elevated/40"
            >
              {/* Icon */}
              <div className="flex items-center text-xl">
                {c.icon || <Layers className="h-5 w-5 text-ink-muted" strokeWidth={1.5} />}
              </div>
              {/* Name */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-ink truncate">{c.name}</span>
                {!c.visible && (
                  <span className="badge-neutral shrink-0">Versteckt</span>
                )}
              </div>
              {/* Description */}
              <div className="flex items-center text-sm text-ink-soft truncate">
                {c.description || '—'}
              </div>
              {/* Color */}
              <div className="flex items-center">
                {c.color ? (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-4 w-4 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-2xs font-mono text-ink-muted">{c.color}</span>
                  </span>
                ) : (
                  <span className="text-2xs text-ink-muted">—</span>
                )}
              </div>
              {/* Sort order */}
              <div className="flex items-center justify-center gap-0.5">
                <button
                  onClick={() => handleMoveSortOrder(c, 'up')}
                  className="qty-btn"
                  title="Nach oben verschieben"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleMoveSortOrder(c, 'down')}
                  className="qty-btn"
                  title="Nach unten verschieben"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Visibility */}
              <div className="flex items-center justify-center">
                <button
                  onClick={() => handleToggleVisibility(c.id, c.visible)}
                  className="qty-btn"
                  title={c.visible ? 'Im Rechner ausblenden' : 'Im Rechner anzeigen'}
                >
                  {c.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Actions */}
              <div className="flex items-center justify-end gap-0.5">
                <button
                  onClick={() => setEditing(c)}
                  className="qty-btn"
                  title="Bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDelete(c)}
                  className="qty-btn text-danger hover:bg-danger/10"
                  title="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Mobile cards ────────────────────────────── */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="card flex flex-col gap-3 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-xl leading-none mt-0.5">
                  {c.icon || <Layers className="h-5 w-5 text-ink-muted" strokeWidth={1.5} />}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink truncate">{c.name}</h3>
                  {c.description && (
                    <p className="mt-0.5 text-sm text-ink-soft truncate">
                      {c.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {c.color && (
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-2xs font-mono text-ink-muted">{c.color}</span>
                      </span>
                    )}
                    {!c.visible && (
                      <span className="badge-neutral">Versteckt</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <button
                  onClick={() => setEditing(c)}
                  className="qty-btn"
                  aria-label="Bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDelete(c)}
                  className="qty-btn text-danger"
                  aria-label="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleVisibility(c.id, c.visible)}
                className="qty-btn flex items-center gap-1.5"
                title={c.visible ? 'Im Rechner ausblenden' : 'Im Rechner anzeigen'}
              >
                {c.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                <span className="text-2xs text-ink-muted">
                  {c.visible ? 'Sichtbar' : 'Versteckt'}
                </span>
              </button>
              <button
                onClick={() => handleMoveSortOrder(c, 'up')}
                className="qty-btn"
                title="Nach oben"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleMoveSortOrder(c, 'down')}
                className="qty-btn"
                title="Nach unten"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Layers
            className="h-8 w-8 text-ink-muted"
            strokeWidth={1.5}
          />
          <p className="mt-2 text-sm font-medium text-ink">
            Keine Kategorien gefunden
          </p>
          <p className="text-2xs text-ink-muted">
            {search
              ? 'Passe deine Suche an oder erstelle eine neue Kategorie.'
              : 'Beginne mit deiner ersten Kategorie.'}
          </p>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary mt-3"
          >
            <Plus className="h-4 w-4" />
            Erste Kategorie anlegen
          </button>
        </div>
      )}

      {/* Modals */}
      <CategoryFormModal
        open={creating}
        onClose={() => setCreating(false)}
      />
      <CategoryFormModal
        open={!!editing}
        onClose={() => setEditing(undefined)}
        category={editing}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(undefined)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
        title="Kategorie löschen?"
        description={`"${confirmDelete?.name}" wird dauerhaft entfernt. Zugehörige Dienste behalten ihre Kategorie-Zuweisung, aber die Kategorie wird nicht mehr angezeigt.`}
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