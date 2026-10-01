import { describe, it, expect } from 'vitest'
import { filterQuotes } from './quoteFilter'
import type { Customer, Quote } from '../types'

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c-1',
    name: 'Musterfirma GmbH',
    email: 'info@musterfirma.de',
    city: 'Musterstadt',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'q-1',
    quoteNumber: 'AN-2026-0001',
    title: 'Marketingpaket Q4',
    customerName: 'Musterfirma GmbH',
    customerId: 'c-1',
    customer: makeCustomer(),
    status: 'draft',
    discountValue: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('filterQuotes', () => {
  it('returns all quotes when filter is empty', () => {
    const quotes = [makeQuote({ id: 'q-1' }), makeQuote({ id: 'q-2' })]
    const result = filterQuotes(quotes, { search: '', status: 'all' })
    expect(result).toHaveLength(2)
  })

  it('filters by status', () => {
    const quotes = [
      makeQuote({ id: 'q-1', status: 'draft' }),
      makeQuote({ id: 'q-2', status: 'sent' }),
      makeQuote({ id: 'q-3', status: 'accepted' }),
    ]
    const result = filterQuotes(quotes, { search: '', status: 'sent' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('q-2')
  })

  it('filters by title', () => {
    const quotes = [
      makeQuote({ id: 'q-1', title: 'Marketingpaket Q4' }),
      makeQuote({ id: 'q-2', title: 'Website Relaunch' }),
    ]
    const result = filterQuotes(quotes, { search: 'website', status: 'all' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('q-2')
  })

  it('filters by quote number', () => {
    const quotes = [
      makeQuote({ id: 'q-1', quoteNumber: 'AN-2026-0001' }),
      makeQuote({ id: 'q-2', quoteNumber: 'AN-2026-0042' }),
    ]
    const result = filterQuotes(quotes, { search: '0042', status: 'all' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('q-2')
  })

  it('filters by customer name', () => {
    const quotes = [
      makeQuote({ id: 'q-1', customerName: 'Musterfirma GmbH' }),
      makeQuote({ id: 'q-2', customerName: 'Beispiel AG' }),
    ]
    const result = filterQuotes(quotes, { search: 'beispiel', status: 'all' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('q-2')
  })

  it('filters by customer email', () => {
    const quotes = [
      makeQuote({ id: 'q-1', customer: makeCustomer({ id: 'c-1', email: 'info@musterfirma.de' }) }),
      makeQuote({ id: 'q-2', customer: makeCustomer({ id: 'c-2', email: 'kontakt@beispiel.de' }) }),
    ]
    const result = filterQuotes(quotes, { search: 'beispiel.de', status: 'all' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('q-2')
  })

  it('filters by customer city', () => {
    const quotes = [
      makeQuote({ id: 'q-1', customer: makeCustomer({ id: 'c-1', city: 'Musterstadt' }) }),
      makeQuote({ id: 'q-2', customer: makeCustomer({ id: 'c-2', city: 'Hamburg' }) }),
    ]
    const result = filterQuotes(quotes, { search: 'hamburg', status: 'all' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('q-2')
  })

  it('combines status and search filters', () => {
    const quotes = [
      makeQuote({ id: 'q-1', status: 'draft', title: 'Website Relaunch' }),
      makeQuote({ id: 'q-2', status: 'sent', title: 'Website Relaunch' }),
      makeQuote({ id: 'q-3', status: 'sent', title: 'Druckmaterialien' }),
    ]
    const result = filterQuotes(quotes, { search: 'website', status: 'sent' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('q-2')
  })

  it('is case-insensitive', () => {
    const quotes = [makeQuote({ title: 'Website Relaunch' })]
    const result = filterQuotes(quotes, { search: 'WEBSITE', status: 'all' })
    expect(result).toHaveLength(1)
  })

  it('returns empty array when nothing matches', () => {
    const quotes = [makeQuote({ title: 'Marketing' })]
    const result = filterQuotes(quotes, { search: 'website', status: 'all' })
    expect(result).toHaveLength(0)
  })
})
