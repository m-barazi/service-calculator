import type { Quote, QuoteStatus } from '../types'

export interface QuoteFilter {
  search: string
  status: QuoteStatus | 'all'
}

export function filterQuotes(quotes: Quote[], filter: QuoteFilter): Quote[] {
  const q = filter.search.trim().toLowerCase()
  const status = filter.status

  return quotes.filter((quote) => {
    if (status !== 'all' && quote.status !== status) return false
    if (!q) return true

    const haystack = [
      quote.title,
      quote.quoteNumber,
      quote.customerName,
      quote.customer?.name,
      quote.customer?.email,
      quote.customer?.city,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(q)
  })
}
