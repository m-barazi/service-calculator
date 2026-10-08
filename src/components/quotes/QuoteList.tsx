import { useState } from 'react'
import { FileText, Plus, Search, X, Copy, Trash2, FolderKanban, ChevronDown } from 'lucide-react'
import { formatDate, formatEUR } from '../../lib/format'
import { STATUS_MAP, STATUS_OPTIONS } from './status'
import { FilterChip } from './FilterChip'
import type { Quote, QuoteStatus } from '../../types'

interface QuoteListProps {
  quotes: Quote[]
  filteredQuotes: Quote[]
  quoteSearch: string
  statusFilter: QuoteStatus | 'all'
  isDuplicating: boolean
  isUpdatingStatus: Record<string, boolean>
  onSearchChange: (v: string) => void
  onStatusFilterChange: (v: QuoteStatus | 'all') => void
  onCreate: () => void
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (quote: Quote) => void
  onStatusChange: (id: string, status: QuoteStatus) => void
}

export function QuoteList({
  quotes,
  filteredQuotes,
  quoteSearch,
  statusFilter,
  isDuplicating,
  isUpdatingStatus,
  onSearchChange,
  onStatusFilterChange,
  onCreate,
  onOpen,
  onDuplicate,
  onDelete,
  onStatusChange,
}: QuoteListProps) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Angebote</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Angebote
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Erstelle und verwalte Angebote für deine Kunden.
          </p>
        </div>
        <button onClick={onCreate} className="btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Neues Angebot
        </button>
      </div>

      {/* Search & filter */}
      {quotes.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={quoteSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Angebote suchen (Titel, Nummer, Kunde)..."
              className="input w-full pl-10"
            />
            {quoteSearch && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 qty-btn"
                aria-label="Suche löschen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              label="Alle"
              active={statusFilter === 'all'}
              onClick={() => onStatusFilterChange('all')}
            />
            {STATUS_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={statusFilter === opt.value}
                onClick={() => onStatusFilterChange(opt.value)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quote cards */}
      {quotes.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <FileText className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-ink">
            Keine Angebote vorhanden
          </p>
          <p className="text-2xs text-ink-muted">
            Erstelle dein erstes Angebot, um loszulegen.
          </p>
          <button onClick={onCreate} className="btn-primary mt-3">
            <Plus className="h-4 w-4" />
            Erstes Angebot erstellen
          </button>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Search className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-ink">Keine Treffer</p>
          <p className="text-2xs text-ink-muted">
            Passe die Suche oder den Status-Filter an.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuotes.map((quote) => {
            const statusInfo = STATUS_MAP[quote.status] ?? STATUS_MAP.draft
            return (
              <div
                key={quote.id}
                className="card group flex flex-col gap-3 p-5 text-left transition hover:border-border-strong"
              >
                <button
                  onClick={() => onOpen(quote.id)}
                  className="text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {quote.quoteNumber && (
                        <p className="eyebrow mb-1">{quote.quoteNumber}</p>
                      )}
                      <h3 className="font-semibold text-ink truncate">
                        {quote.title}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-medium ${statusInfo.cls}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  {(quote.customerName || quote.projectName) && (
                    <p className="mt-1 text-sm text-ink-soft truncate">
                      {quote.projectName ? (
                        <span className="flex items-center gap-1.5">
                          <FolderKanban className="h-3 w-3" />
                          {quote.projectName}
                        </span>
                      ) : (
                        quote.customerName
                      )}
                    </p>
                  )}
                  <p className="mt-2 text-2xs text-ink-muted">
                    {formatDate(quote.createdAt)}
                  </p>
                </button>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div className="relative">
                    <select
                      value={quote.status}
                      onChange={(e) => {
                        e.stopPropagation()
                        onStatusChange(quote.id, e.target.value as QuoteStatus)
                      }}
                      disabled={isUpdatingStatus[quote.id]}
                      className="appearance-none rounded-full border border-border bg-surface py-1 pl-2.5 pr-7 text-2xs font-medium text-ink-soft transition hover:border-border-strong hover:text-ink disabled:opacity-60"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="num text-sm font-semibold text-ink">
                      {formatEUR(quote.totalGross ?? 0)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDuplicate(quote.id)
                      }}
                      disabled={isDuplicating}
                      className="qty-btn"
                      title="Duplizieren"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(quote)
                      }}
                      className="qty-btn text-danger hover:bg-danger/10"
                      title="Löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
