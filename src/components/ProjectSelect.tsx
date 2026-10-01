import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, FolderKanban, Plus, Search, X } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import type { Customer, Project } from '../types'

interface ProjectSelectProps {
  value?: Project
  onChange: (project?: Project) => void
  customerId?: string
}

export function ProjectSelect({ value, onChange, customerId }: ProjectSelectProps) {
  const { projects, customers, addProject } = useApp()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = customerId ? projects.filter((p) => !p.customerId || p.customerId === customerId) : projects
    if (!q) return base
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q),
    )
  }, [projects, search, customerId])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelect = (project?: Project) => {
    onChange(project)
    setOpen(false)
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setIsCreating(true)
    try {
      const created = await addProject({
        name,
        description: newDescription.trim() || undefined,
        customerId,
        status: 'active',
      })
      onChange(created)
      setCreateOpen(false)
      setNewName('')
      setNewDescription('')
      setOpen(false)
    } finally {
      setIsCreating(false)
    }
  }

  const customer = useMemo(
    () => customers.find((c) => c.id === value?.customerId),
    [customers, value?.customerId],
  )

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={[
            'input flex flex-1 items-center justify-between gap-2 text-left',
            value ? 'text-ink' : 'text-ink-muted',
          ].join(' ')}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">
            {value ? (
              <span className="flex items-center gap-2">
                <FolderKanban className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                {value.name}
                {customer ? ` · ${customer.name}` : ''}
              </span>
            ) : (
              'Projekt auswählen…'
            )}
          </span>
          <ChevronDown
            className={[
              'h-4 w-4 shrink-0 text-ink-muted transition-transform',
              open ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="qty-btn shrink-0"
          title="Neues Projekt"
          aria-label="Neues Projekt"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-border bg-elevated p-2 shadow-elevated">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Projekte suchen…"
              className="input w-full pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-auto">
            {value && (
              <button
                type="button"
                onClick={() => handleSelect(undefined)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-surface"
              >
                <X className="h-3.5 w-3.5" />
                Kein Projekt zuweisen
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-2.5 py-6 text-center text-sm text-ink-muted">
                {search.trim() ? 'Keine Treffer.' : 'Noch keine Projekte vorhanden.'}
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5" role="listbox">
                {filtered.map((p) => (
                  <li key={p.id} role="option" aria-selected={value?.id === p.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      className={[
                        'flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        value?.id === p.id
                          ? 'bg-accent/10 text-ink'
                          : 'text-ink-soft hover:bg-surface hover:text-ink',
                      ].join(' ')}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-2xs text-ink-muted">
                        {[p.customerName, p.description].filter(Boolean).join(' · ') || 'Keine Details'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setCreateOpen(true)
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong py-2 text-2xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            Neues Projekt
          </button>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 animate-fade-in bg-canvas/60 backdrop-blur-md"
            onClick={() => setCreateOpen(false)}
            aria-hidden
          />
          <div
            className={[
              'relative flex w-full flex-col overflow-hidden bg-elevated shadow-elevated',
              'animate-slide-up rounded-t-3xl sm:animate-scale-in sm:rounded-3xl sm:border sm:border-border',
              'max-h-[92vh] sm:max-h-[88vh] max-w-md',
            ].join(' ')}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">Neues Projekt</h2>
                <p className="mt-1 text-sm text-ink-muted">Erstelle ein neues Projekt und weise es direkt zu.</p>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="qty-btn -m-1 shrink-0"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">Name</span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="z. B. Website Relaunch"
                    className="input w-full"
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">Beschreibung (optional)</span>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Kurze Beschreibung"
                    rows={3}
                    className="input w-full resize-none"
                  />
                </label>
                {customerId && (
                  <p className="text-2xs text-ink-muted">
                    Zugeordneter Kunde: {customers.find((c) => c.id === customerId)?.name ?? 'Unbekannt'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-canvas/40 px-5 py-3 sm:px-6">
              <button onClick={() => setCreateOpen(false)} className="btn-secondary" type="button">
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || isCreating}
                className="btn-primary"
              >
                {isCreating ? 'Erstelle…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
