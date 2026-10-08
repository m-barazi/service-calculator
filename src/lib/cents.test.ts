import { describe, it, expect } from 'vitest'
import {
  toCents,
  toEuros,
  addVatCents,
  removeVatCents,
  computeDiscountCents,
} from './cents'

describe('toCents / toEuros', () => {
  it('rounds to nearest cent', () => {
    expect(toCents(1)).toBe(100)
    expect(toCents(0.005)).toBe(1)
    expect(toCents(0.004)).toBe(0)
  })

  it('round trips euros -> cents -> euros', () => {
    expect(toEuros(toCents(12.34))).toBe(12.34)
    expect(toEuros(toCents(99.999))).toBe(100)
  })
})

describe('addVatCents', () => {
  it('adds 19% VAT and rounds to cents', () => {
    expect(addVatCents(100, 0.19)).toBe(119)
    expect(addVatCents(1, 0.19)).toBe(1) // 1.19 -> 1
  })
})

describe('removeVatCents', () => {
  it('removes 19% VAT and rounds', () => {
    expect(removeVatCents(119, 0.19)).toBe(100)
  })

  it('returns 0 for 0', () => {
    expect(removeVatCents(0, 0.19)).toBe(0)
  })
})

describe('computeDiscountCents', () => {
  it('computes percentage discount', () => {
    expect(computeDiscountCents(10000, 'percent', 10)).toBe(1000)
  })

  it('computes fixed amount discount', () => {
    expect(computeDiscountCents(10000, 'amount', 25)).toBe(2500)
  })

  it('caps at subtotal and never goes negative', () => {
    expect(computeDiscountCents(1000, 'amount', 5000)).toBe(1000)
    expect(computeDiscountCents(1000, 'percent', 150)).toBe(1000)
    expect(computeDiscountCents(1000, undefined, 500)).toBe(0)
  })
})
