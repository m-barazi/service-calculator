import { describe, it, expect } from 'vitest';
import {
  CENTS_PER_EURO,
  eurosToCents,
  centsToEuros,
  addVatCents,
  removeVatCents,
  computeDiscountCents,
} from './money.js';

describe('eurosToCents', () => {
  it('converts whole euros', () => {
    expect(eurosToCents(1)).toBe(100);
  });

  it('rounds to nearest cent', () => {
    expect(eurosToCents(0.005)).toBe(1);
    expect(eurosToCents(0.004)).toBe(0);
    expect(eurosToCents(10.999)).toBe(1100);
  });

  it('handles string numbers', () => {
    expect(eurosToCents('12.34')).toBe(1234);
  });

  it('returns null for null/undefined', () => {
    expect(eurosToCents(null)).toBeNull();
    expect(eurosToCents(undefined)).toBeNull();
  });
});

describe('centsToEuros', () => {
  it('converts cents to euros', () => {
    expect(centsToEuros(100)).toBe(1);
    expect(centsToEuros(1234)).toBe(12.34);
  });

  it('returns 0 for null', () => {
    expect(centsToEuros(null)).toBe(0);
  });
});

describe('VAT helpers', () => {
  it('adds 19% VAT and rounds', () => {
    expect(addVatCents(100, 0.19)).toBe(119);
  });

  it('is reversible within rounding tolerance', () => {
    const gross = addVatCents(1000, 0.19);
    expect(gross).toBe(1190);
    expect(removeVatCents(gross, 0.19)).toBe(1000);
  });

  it('handles 0% VAT', () => {
    expect(addVatCents(555, 0)).toBe(555);
    expect(removeVatCents(555, 0)).toBe(555);
  });
});

describe('computeDiscountCents', () => {
  it('computes percentage discount', () => {
    expect(computeDiscountCents(10000, 'percent', 10)).toBe(1000);
  });

  it('computes fixed amount discount', () => {
    expect(computeDiscountCents(10000, 'amount', 50)).toBe(5000);
  });

  it('caps discount at subtotal', () => {
    expect(computeDiscountCents(1000, 'amount', 5000)).toBe(1000);
    expect(computeDiscountCents(1000, 'percent', 150)).toBe(1000);
  });

  it('returns 0 without discount type', () => {
    expect(computeDiscountCents(1000, null, 500)).toBe(0);
  });
});
