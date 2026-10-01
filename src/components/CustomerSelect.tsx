import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, Search, User, X } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { CustomerFormModal } from './CustomerFormModal'
import type { Customer } from '../types'

interface CustomerSelectProps {
  value?: Customer
  onChange: (customer?: Customer) => void
}

export function CustomerSelect({ value, onChange }: CustomerSelectProps) {
  const { customers } = useApp()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.city?.toLowerCase().includes(q) ?? false),
    )
  }, [customers, search])

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

  const handleSelect = (customer?: Customer) => {
    onChange(customer)
    setOpen(false)
  }

  const handleCreated = (customer: Customer) => {
    onChange(customer)
    setCreateOpen(false)
  }

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
                <User className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                {value.name}
                {value.city ? ` · ${value.city}` : ''}
              </span>
            ) : (
              'Kunde auswählen…'
            )}
          </span>
          <ChevronDown
            className={[
              'h-4 w-4 shrink-0 text-ink-muted transition-transform',
              open ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => setEditCustomer(value)}
            className="qty-btn shrink-0"
            title="Kunde bearbeiten"
            aria-label="Kunde bearbeiten"
          >
            <User className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="qty-btn shrink-0"
            title="Neuer Kunde"
            aria-label="Neuer Kunde"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-border bg-elevated p-2 shadow-elevated">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kunden suchen…"
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
                Keinen Kunden zuweisen
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-2.5 py-6 text-center text-sm text-ink-muted">
                {search.trim() ? 'Keine Treffer.' : 'Noch keine Kunden vorhanden.'}
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5" role="listbox">
                {filtered.map((c) => (
                  <li key={c.id} role="option" aria-selected={value?.id === c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={[
                        'flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        value?.id === c.id
                          ? 'bg-accent/10 text-ink'
                          : 'text-ink-soft hover:bg-surface hover:text-ink',
                      ].join(' ')}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-2xs text-ink-muted">
                        {[c.email, c.city].filter(Boolean).join(' · ') || 'Keine Kontaktdaten'}
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
            Neuer Kunde
          </button>
        </div>
      )}

      <CustomerFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <CustomerFormModal
        open={!!editCustomer}
        onClose={() => setEditCustomer(undefined)}
        customer={editCustomer}
      />
    </div>
  )
}
