import { describe, it, expect } from 'vitest'
import { buildCartQuoteItems, cartToItems } from './cartQuote'
import type { Service } from '../types'

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

describe('buildCartQuoteItems', () => {
  it('builds items from cart entries with matching services', () => {
    const services = [
      makeService({ id: 'svc-1', salePrice: 100 }),
      makeService({ id: 'svc-2', salePrice: 250 }),
    ]
    const cart = {
      'svc-1': { quantity: 2, note: 'Notiz A' },
      'svc-2': { quantity: 1, note: '' },
    }

    const items = buildCartQuoteItems(cart, services)

    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      serviceId: 'svc-1',
      unitPrice: 100,
      quantity: 2,
      customNote: 'Notiz A',
      sortOrder: 0,
    })
    expect(items[1]).toEqual({
      serviceId: 'svc-2',
      unitPrice: 250,
      quantity: 1,
      customNote: undefined,
      sortOrder: 1,
    })
  })

  it('skips entries with unknown services', () => {
    const services = [makeService({ id: 'svc-1' })]
    const cart = {
      'svc-1': { quantity: 1, note: '' },
      'svc-unknown': { quantity: 5, note: '' },
    }

    const items = buildCartQuoteItems(cart, services)

    expect(items).toHaveLength(1)
    expect(items[0].serviceId).toBe('svc-1')
  })

  it('skips entries with zero or negative quantity', () => {
    const services = [makeService({ id: 'svc-1' })]
    const cart = {
      'svc-1': { quantity: 0, note: '' },
      'svc-2': { quantity: -3, note: '' },
    }

    const items = buildCartQuoteItems(cart, services)

    expect(items).toHaveLength(0)
  })

  it('returns empty array for empty cart', () => {
    const items = buildCartQuoteItems({}, [makeService()])
    expect(items).toHaveLength(0)
  })

  it('assigns increasing sortOrder starting at 0', () => {
    const services = [
      makeService({ id: 'a' }),
      makeService({ id: 'b' }),
      makeService({ id: 'c' }),
    ]
    const cart = {
      a: { quantity: 1, note: '' },
      b: { quantity: 1, note: '' },
      c: { quantity: 1, note: '' },
    }

    const items = buildCartQuoteItems(cart, services)

    expect(items.map((i) => i.sortOrder)).toEqual([0, 1, 2])
  })
})

describe('cartToItems', () => {
  it('converts cart map to cart item array', () => {
    const cart = {
      'svc-1': { quantity: 2, note: 'Notiz' },
      'svc-2': { quantity: 3, note: '' },
    }

    const items = cartToItems(cart)

    expect(items).toEqual([
      { serviceId: 'svc-1', quantity: 2, note: 'Notiz' },
      { serviceId: 'svc-2', quantity: 3, note: '' },
    ])
  })
})
