import { describe, it, expect } from 'vitest'
import { computeLine, computeCart } from './calc'
import type { Service, CartItem } from '../types'

const VAT = 0.19

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 'svc-1',
    name: 'Test Service',
    categoryId: 'cat-1',
    purchasePrice: 10,
    salePrice: 25,
    defaultQuantity: 1,
    visible: true,
    pinned: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('computeLine', () => {
  it('calculates net/gross totals and profit for a single unit', () => {
    const service = makeService()
    const line = computeLine(service, 1, VAT)

    expect(line.totalCostNet).toBe(10)
    expect(line.totalSaleNet).toBe(25)
    expect(line.profitNet).toBe(15)
    expect(line.profitMarginPct).toBe(0.6)
    expect(line.totalCostGross).toBeCloseTo(11.9, 5)
    expect(line.totalSaleGross).toBeCloseTo(29.75, 5)
  })

  it('scales correctly for larger quantities', () => {
    const service = makeService({ purchasePrice: 5, salePrice: 12 })
    const line = computeLine(service, 4, VAT)

    expect(line.totalCostNet).toBe(20)
    expect(line.totalSaleNet).toBe(48)
    expect(line.profitNet).toBe(28)
    expect(line.quantity).toBe(4)
  })

  it('returns zero for negative quantities', () => {
    const service = makeService()
    const line = computeLine(service, -3, VAT)

    expect(line.quantity).toBe(0)
    expect(line.totalSaleNet).toBe(0)
    expect(line.profitNet).toBe(0)
  })

  it('handles zero sale price without division error', () => {
    const service = makeService({ salePrice: 0 })
    const line = computeLine(service, 2, VAT)

    expect(line.totalSaleNet).toBe(0)
    expect(line.profitMarginPct).toBe(0)
    expect(line.profitNet).toBe(-20)
  })
})

describe('computeCart', () => {
  it('sums multiple lines with VAT', () => {
    const services = [
      makeService({ id: 'a', purchasePrice: 10, salePrice: 20 }),
      makeService({ id: 'b', purchasePrice: 5, salePrice: 15 }),
    ]
    const cart: CartItem[] = [
      { serviceId: 'a', quantity: 2, note: '' },
      { serviceId: 'b', quantity: 3, note: '' },
    ]

    const totals = computeCart(cart, services, VAT)

    expect(totals.totalCostNet).toBe(35) // 20 + 15
    expect(totals.totalSaleNet).toBe(85) // 40 + 45
    expect(totals.profitNet).toBe(50)
    expect(totals.itemCount).toBe(5)
    expect(totals.lines).toHaveLength(2)
  })

  it('skips items with zero or negative quantity', () => {
    const services = [makeService({ id: 'a' })]
    const cart: CartItem[] = [{ serviceId: 'a', quantity: 0, note: '' }]

    const totals = computeCart(cart, services, VAT)

    expect(totals.lines).toHaveLength(0)
    expect(totals.itemCount).toBe(0)
    expect(totals.totalSaleNet).toBe(0)
  })

  it('ignores cart items whose service no longer exists', () => {
    const services = [makeService({ id: 'a' })]
    const cart: CartItem[] = [
      { serviceId: 'a', quantity: 1, note: '' },
      { serviceId: 'deleted', quantity: 1, note: '' },
    ]

    const totals = computeCart(cart, services, VAT)

    expect(totals.lines).toHaveLength(1)
    expect(totals.totalSaleNet).toBe(25)
  })

  it('preserves notes on computed lines', () => {
    const services = [makeService({ id: 'a' })]
    const cart: CartItem[] = [{ serviceId: 'a', quantity: 1, note: 'Rush order' }]

    const totals = computeCart(cart, services, VAT)

    expect(totals.lines[0].note).toBe('Rush order')
  })

  it('returns overall profit margin across the cart', () => {
    const services = [makeService({ id: 'a', purchasePrice: 25, salePrice: 100 })]
    const cart: CartItem[] = [{ serviceId: 'a', quantity: 1, note: '' }]

    const totals = computeCart(cart, services, VAT)

    expect(totals.profitNet).toBe(75)
    expect(totals.profitMarginPct).toBe(0.75)
  })

  it('applies no discount by default', () => {
    const services = [makeService({ id: 'a', salePrice: 100 })]
    const cart: CartItem[] = [{ serviceId: 'a', quantity: 1, note: '' }]

    const totals = computeCart(cart, services, VAT)

    expect(totals.discountAmount).toBe(0)
    expect(totals.discountedSaleNet).toBe(100)
    expect(totals.discountedSaleGross).toBe(119)
  })

  it('applies percentage discount on cart', () => {
    const services = [makeService({ id: 'a', salePrice: 100 })]
    const cart: CartItem[] = [{ serviceId: 'a', quantity: 1, note: '' }]

    const totals = computeCart(cart, services, VAT, 'percent', 10)

    expect(totals.discountAmount).toBe(10)
    expect(totals.discountedSaleNet).toBe(90)
    expect(totals.discountedSaleGross).toBeCloseTo(107.1, 1)
    expect(totals.profitNet).toBe(80)
  })

  it('applies fixed amount discount on cart', () => {
    const services = [makeService({ id: 'a', purchasePrice: 50, salePrice: 200 })]
    const cart: CartItem[] = [{ serviceId: 'a', quantity: 1, note: '' }]

    const totals = computeCart(cart, services, VAT, 'amount', 30)

    expect(totals.discountAmount).toBe(30)
    expect(totals.discountedSaleNet).toBe(170)
    expect(totals.profitNet).toBe(120)
  })

  it('does not let discount exceed subtotal', () => {
    const services = [makeService({ id: 'a', salePrice: 100 })]
    const cart: CartItem[] = [{ serviceId: 'a', quantity: 1, note: '' }]

    const totals = computeCart(cart, services, VAT, 'amount', 500)

    expect(totals.discountAmount).toBe(100)
    expect(totals.discountedSaleNet).toBe(0)
    expect(totals.profitNet).toBe(-10)
  })

  it('caps percentage discount at subtotal', () => {
    const services = [makeService({ id: 'a', salePrice: 100 })]
    const cart: CartItem[] = [{ serviceId: 'a', quantity: 1, note: '' }]

    const totals = computeCart(cart, services, VAT, 'percent', 150)

    expect(totals.discountAmount).toBe(100)
    expect(totals.discountedSaleNet).toBe(0)
  })
})
