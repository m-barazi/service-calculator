import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { usePagedList } from '../hooks/usePagedList'
import { fetchQuotesPage } from '../lib/api'
import { filterQuotes } from '../lib/quoteFilter'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { QuoteList } from '../components/quotes/QuoteList'
import { QuoteDetail } from '../components/quotes/QuoteDetail'
import { Pagination } from '../components/Pagination'
import type { Quote, QuoteStatus, QuoteWithItems } from '../types'

const PAGE_SIZE = 12

export function AngebotePage() {
  const {
    addQuote,
    deleteQuote,
    duplicateQuote,
    fetchQuoteDetail,
  } = useApp()

  const {
    data: quotes,
    pagination,
    isLoading: isLoadingQuotes,
    loadPage,
    refresh,
  } = usePagedList<Quote>({ fetchPage: fetchQuotesPage, limit: PAGE_SIZE })

  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithItems | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Quote | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [quoteSearch, setQuoteSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')

  const filteredQuotes = useMemo(
    () => filterQuotes(quotes, { search: quoteSearch, status: statusFilter }),
    [quotes, quoteSearch, statusFilter],
  )

  const openQuote = useCallback(async (id: string) => {
    const detail = await fetchQuoteDetail(id)
    setSelectedQuote(detail)
  }, [fetchQuoteDetail])

  // Open quote from URL query param once quotes are loaded
  useEffect(() => {
    const id = searchParams.get('id')
    if (!id) return
    if (isLoadingQuotes) return
    const exists = quotes.some((q) => q.id === id)
    if (!exists) return
    openQuote(id).catch(() => {})
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoadingQuotes, quotes])

  const handleCreateQuote = useCallback(async () => {
    const created = await addQuote({
      title: 'Neues Angebot',
      status: 'draft',
      discountValue: 0,
    })
    const detail = await fetchQuoteDetail(created.id)
    setSelectedQuote(detail)
  }, [addQuote, fetchQuoteDetail])

  const handleDuplicateQuote = useCallback(
    async (id: string) => {
      setIsDuplicating(true)
      try {
        const copy = await duplicateQuote(id)
        await refresh()
        const detail = await fetchQuoteDetail(copy.id)
        setSelectedQuote(detail)
      } finally {
        setIsDuplicating(false)
      }
    },
    [duplicateQuote, refresh, fetchQuoteDetail],
  )

  const handleDeleteQuote = useCallback(async () => {
    if (!confirmDelete) return
    setIsDeleting(true)
    try {
      await deleteQuote(confirmDelete.id)
      setSelectedQuote(null)
      await refresh()
    } finally {
      setIsDeleting(false)
      setConfirmDelete(null)
    }
  }, [confirmDelete, deleteQuote, refresh])

  if (isLoadingQuotes && quotes.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-ink-muted border-t-ink" />
            <p className="mt-4 text-sm text-ink-soft">Angebote wird geladen...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {selectedQuote ? (
        <QuoteDetail
          quote={selectedQuote}
          onUpdate={setSelectedQuote}
          onBack={() => setSelectedQuote(null)}
          onDuplicate={handleDuplicateQuote}
          onDelete={() => setConfirmDelete(selectedQuote)}
          isDuplicating={isDuplicating}
        />
      ) : (
        <QuoteList
          quotes={quotes}
          filteredQuotes={filteredQuotes}
          quoteSearch={quoteSearch}
          statusFilter={statusFilter}
          isDuplicating={isDuplicating}
          onSearchChange={setQuoteSearch}
          onStatusFilterChange={setStatusFilter}
          onCreate={handleCreateQuote}
          onOpen={openQuote}
          onDuplicate={handleDuplicateQuote}
          onDelete={setConfirmDelete}
        />
      )}

      {!selectedQuote && (
        <Pagination pagination={pagination} onPageChange={loadPage} />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteQuote}
        title="Angebot löschen?"
        description={`"${confirmDelete?.title}" wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel={isDeleting ? 'Löschen...' : 'Löschen'}
        variant="danger"
        disabled={isDeleting}
      />
    </>
  )
}

export default AngebotePage
