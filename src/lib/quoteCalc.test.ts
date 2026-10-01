import { describe, it, expect } from 'vitest'
import { computeQuoteLine, computeQuoteTotals, getItemName } from './quoteCalc'
import type { QuoteItem, Service } from '../types'

const VAT = 0.19

function makeItem(overrides: Partial<QuoteItem> = {}): QuoteItem {
  return {
    id: 'item-1',
    quoteId: 'quote-1',
    serviceId: 'svc-1',
    customName: undefined,
    customNote: undefined,
    quantity: 1,
    unitPrice: 100,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    service: undefined,
    ...overrides,
  }
}

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 'svc-1',
    name: 'Test Service',
    categoryId: 'cat-1',
    purchasePrice: 50,
    salePrice: 100,
    defaultQuantity: 1,
    visible: true,
    pinned: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('computeQuoteLine', () => {
  it('calculates net and gross for a line', () => {
    const item = makeItem({ quantity: 3, unitPrice: 50 })
    const line = computeQuoteLine(item, VAT)

    expect(line.lineNet).toBe(150)
    expect(line.lineGross).toBeCloseTo(178.5, 5)
    expect(line.item).toBe(item)
  })

  it('includes the linked service when present', () => {
    const service = makeService()
    const item = makeItem({ service })
    const line = computeQuoteLine(item, VAT)

    expect(line.service).toBe(service)
  })
})

describe('computeQuoteTotals', () => {
  it('sums lines without discount', () => {
    const items = [
      makeItem({ id: 'a', quantity: 2, unitPrice: 100 }),
      makeItem({ id: 'b', quantity: 1, unitPrice: 50 }),
    ]

    const totals = computeQuoteTotals(items, VAT)

    expect(totals.subtotalNet).toBe(250)
    expect(totals.discountAmount).toBe(0)
    expect(totals.totalNet).toBe(250)
    expect(totals.vatAmount).toBeCloseTo(47.5, 5)
    expect(totals.totalGross).toBeCloseTo(297.5, 5)
    expect(totals.lines).toHaveLength(2)
  })

  it('applies a percentage discount', () => {
    const items = [makeItem({ quantity: 1, unitPrice: 200 })]

    const totals = computeQuoteTotals(items, VAT, 'percent', 10)

    expect(totals.subtotalNet).toBe(200)
    expect(totals.discountAmount).toBe(20)
    expect(totals.totalNet).toBe(180)
    expect(totals.vatAmount).toBeCloseTo(34.2, 5)
    expect(totals.totalGross).toBeCloseTo(214.2, 5)
  })

  it('applies a fixed amount discount', () => {
    const items = [makeItem({ quantity: 1, unitPrice: 300 })]

    const totals = computeQuoteTotals(items, VAT, 'amount', 50)

    expect(totals.subtotalNet).toBe(300)
    expect(totals.discountAmount).toBe(50)
    expect(totals.totalNet).toBe(250)
    expect(totals.vatAmount).toBeCloseTo(47.5, 5)
  })

  it('ignores a zero discount value', () => {
    const items = [makeItem({ quantity: 1, unitPrice: 100 })]

    const totals = computeQuoteTotals(items, VAT, 'percent', 0)

    expect(totals.discountAmount).toBe(0)
    expect(totals.totalNet).toBe(100)
  })

  it('does not apply negative totals when discount exceeds subtotal', () => {
    const items = [makeItem({ quantity: 1, unitPrice: 30 })]

    const totals = computeQuoteTotals(items, VAT, 'amount', 50)

    expect(totals.totalNet).toBe(-20)
    expect(totals.vatAmount).toBeCloseTo(-3.8, 5)
  })
})

describe('getItemName', () => {
  it('prefers the linked service name', () => {
    const service = makeService({ name: 'Branding Package' })
    const item = makeItem({ service, customName: 'Custom' })

    expect(getItemName(item)).toBe('Branding Package')
  })

  it('falls back to custom name', () => {
    const item = makeItem({ customName: 'Custom Position' })

    expect(getItemName(item)).toBe('Custom Position')
  })

  it('returns placeholder when no name is available', () => {
    const item = makeItem()

    expect(getItemName(item)).toBe('(Unbenannt)')
  })
})
