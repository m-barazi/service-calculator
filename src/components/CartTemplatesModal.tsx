import { useEffect, useMemo, useState } from 'react'
import { FolderOpen, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { Modal } from './Modal'
import { useApp } from '../hooks/useApp'
import { formatDate } from '../lib/format'

interface CartTemplatesModalProps {
  open: boolean
  onClose: () => void
}

export function CartTemplatesModal({ open, onClose }: CartTemplatesModalProps) {
  const { cartTemplates, cart, cartLineCount, saveCartTemplate, loadCartTemplate, deleteCartTemplate } = useApp()
  const [mode, setMode] = useState<'list' | 'save'>('list')
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [loadMode, setLoadMode] = useState<'replace' | 'merge'>('replace')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMode('list')
    setName('')
    setSearch('')
    setLoadMode('replace')
    setConfirmDelete(null)
  }, [open])

  const canSaveCurrent = cartLineCount > 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cartTemplates
    return cartTemplates.filter((t) => t.name.toLowerCase().includes(q))
  }, [cartTemplates, search])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !canSaveCurrent) return
    saveCartTemplate(trimmed)
    setMode('list')
    setName('')
  }

  const handleLoad = (id: string) => {
    loadCartTemplate(id, loadMode)
    onClose()
  }

  const handleDelete = (id: string) => {
    deleteCartTemplate(id)
    setConfirmDelete(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Warenkorb-Vorlagen" size="lg">
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('list')}
            className={[
              'btn flex-1',
              mode === 'list' ? 'btn-primary' : 'btn-secondary',
            ].join(' ')}
          >
            <FolderOpen className="h-4 w-4" />
            Laden / Löschen
          </button>
          <button
            onClick={() => setMode('save')}
            disabled={!canSaveCurrent}
            className={[
              'btn flex-1',
              mode === 'save' ? 'btn-primary' : 'btn-secondary',
            ].join(' ')}
            title={canSaveCurrent ? '' : 'Warenkorb ist leer'}
          >
            <Save className="h-4 w-4" />
            Aktuellen speichern
          </button>
        </div>

        {mode === 'save' ? (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                Name der Vorlage
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Starterpaket Web"
                className="input w-full"
                autoFocus
              />
            </div>
            <p className="text-sm text-ink-soft">
              Es werden {cartLineCount} Position{cartLineCount === 1 ? '' : 'en'} mit insgesamt{' '}
              {Object.values(cart).reduce((s, e) => s + e.quantity, 0)} Stück gespeichert.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMode('list')} className="btn-secondary">
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={!name.trim() || !canSaveCurrent}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                Speichern
              </button>
            </div>
          </form>
        ) : (
          <>
            {cartTemplates.length > 0 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Vorlagen suchen..."
                  className="input w-full pl-10"
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
            )}

            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3 text-sm text-ink-soft">
              <span className="text-2xs font-semibold uppercase tracking-wider">Laden als</span>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="loadMode"
                  checked={loadMode === 'replace'}
                  onChange={() => setLoadMode('replace')}
                  className="accent-accent"
                />
                Ersetzen
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="loadMode"
                  checked={loadMode === 'merge'}
                  onChange={() => setLoadMode('merge')}
                  className="accent-accent"
                />
                Hinzufügen
              </label>
            </div>

            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-muted">
                {cartTemplates.length === 0
                  ? 'Noch keine Vorlagen vorhanden. Speicher deinen aktuellen Warenkorb.'
                  : 'Keine Treffer.'}
              </div>
            ) : (
              <ul className="flex max-h-80 flex-col gap-2 overflow-auto">
                {filtered.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface/40 p-3"
                  >
                    <button
                      onClick={() => handleLoad(t.id)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-ink">{t.name}</p>
                      <p className="text-2xs text-ink-muted">
                        {t.items.length} Position{t.items.length === 1 ? '' : 'en'} · {formatDate(t.updatedAt)}
                      </p>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(t.id)}
                      className="qty-btn text-danger hover:bg-danger/10"
                      title="Vorlage löschen"
                      aria-label="Vorlage löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {confirmDelete && (
        <div className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-4">
          <p className="text-sm text-ink">
            Vorlage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary text-xs">
              Abbrechen
            </button>
            <button onClick={() => handleDelete(confirmDelete)} className="btn-danger text-xs">
              Löschen
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
