import { describe, it, expect } from 'vitest';
import { buildDashboardData } from './dashboard.js';

function makeQuote(overrides = {}) {
  return {
    id: 'q-1',
    quoteNumber: 'AN-2026-0001',
    title: 'Testangebot',
    customerName: 'Musterfirma',
    customerId: 'c-1',
    status: 'draft',
    discountType: undefined,
    discountValue: 0,
    notes: '',
    validUntil: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeItem(overrides = {}) {
  return {
    id: 'qi-1',
    quoteId: 'q-1',
    serviceId: 's-1',
    customName: undefined,
    customNote: undefined,
    quantity: 1,
    unitPrice: 100,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    service: undefined,
    ...overrides,
  };
}

describe('buildDashboardData', () => {
  it('counts quotes and statuses', () => {
    const quotes = [
      makeQuote({ id: 'q-1', status: 'draft' }),
      makeQuote({ id: 'q-2', status: 'sent' }),
      makeQuote({ id: 'q-3', status: 'accepted' }),
    ];

    const data = buildDashboardData(quotes, [], [], 0.19);

    expect(data.quoteCount).toBe(3);
    expect(data.quoteStatusCounts).toEqual({ draft: 1, sent: 1, accepted: 1, rejected: 0 });
  });

  it('sums accepted quote totals without discount', () => {
    const quotes = [
      makeQuote({ id: 'q-1', status: 'accepted' }),
      makeQuote({ id: 'q-2', status: 'draft' }),
    ];
    const items = [
      makeItem({ quoteId: 'q-1', quantity: 2, unitPrice: 100 }),
      makeItem({ quoteId: 'q-2', quantity: 1, unitPrice: 500 }),
    ];

    const data = buildDashboardData(quotes, items, [], 0.19);

    expect(data.acceptedTotalNet).toBe(200);
    expect(data.acceptedTotalGross).toBeCloseTo(238, 1);
  });

  it('applies percentage discount on accepted quotes', () => {
    const quotes = [
      makeQuote({ id: 'q-1', status: 'accepted', discountType: 'percent', discountValue: 10 }),
    ];
    const items = [makeItem({ quoteId: 'q-1', quantity: 1, unitPrice: 200 })];

    const data = buildDashboardData(quotes, items, [], 0);

    expect(data.acceptedTotalNet).toBe(180);
    expect(data.acceptedTotalGross).toBe(180);
  });

  it('applies fixed amount discount on accepted quotes', () => {
    const quotes = [
      makeQuote({ id: 'q-1', status: 'accepted', discountType: 'amount', discountValue: 50 }),
    ];
    const items = [makeItem({ quoteId: 'q-1', quantity: 1, unitPrice: 300 })];

    const data = buildDashboardData(quotes, items, [], 0);

    expect(data.acceptedTotalNet).toBe(250);
  });

  it('does not go negative when discount exceeds subtotal', () => {
    const quotes = [
      makeQuote({ id: 'q-1', status: 'accepted', discountType: 'amount', discountValue: 500 }),
    ];
    const items = [makeItem({ quoteId: 'q-1', quantity: 1, unitPrice: 100 })];

    const data = buildDashboardData(quotes, items, [], 0);

    expect(data.acceptedTotalNet).toBe(0);
  });

  it('builds top services by quantity', () => {
    const items = [
      makeItem({ quoteId: 'q-1', serviceId: 's-1', quantity: 2, unitPrice: 100, service: { name: 'Service A' } }),
      makeItem({ quoteId: 'q-1', serviceId: 's-2', quantity: 5, unitPrice: 50, service: { name: 'Service B' } }),
      makeItem({ quoteId: 'q-2', serviceId: 's-1', quantity: 1, unitPrice: 100, service: { name: 'Service A' } }),
    ];

    const data = buildDashboardData([], items, [], 0.19);

    expect(data.topServices).toHaveLength(2);
    expect(data.topServices[0].serviceId).toBe('s-2');
    expect(data.topServices[0].count).toBe(5);
    expect(data.topServices[1].serviceId).toBe('s-1');
    expect(data.topServices[1].count).toBe(3);
  });

  it('uses customName for freetext items in top services', () => {
    const items = [
      makeItem({ serviceId: undefined, customName: 'Sonderleistung', quantity: 1, unitPrice: 99 }),
    ];

    const data = buildDashboardData([], items, [], 0);

    expect(data.topServices[0].serviceId).toBe('Sonderleistung');
    expect(data.topServices[0].name).toBe('Sonderleistung');
    expect(data.topServices[0].count).toBe(1);
  });

  it('limits top services to 5', () => {
    const items = Array.from({ length: 7 }, (_, i) =>
      makeItem({ serviceId: `s-${i}`, quantity: 1, unitPrice: 10, service: { name: `Service ${i}` } }),
    );

    const data = buildDashboardData([], items, [], 0);

    expect(data.topServices).toHaveLength(5);
  });

  it('calculates monthly recurring from accepted quotes within 90 days', () => {
    const now = new Date();
    const old = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

    const quotes = [
      makeQuote({ id: 'q-old', status: 'accepted', createdAt: old }),
      makeQuote({ id: 'q-new', status: 'accepted', createdAt: recent }),
      makeQuote({ id: 'q-draft', status: 'draft', createdAt: recent }),
    ];
    const items = [
      makeItem({ quoteId: 'q-old', quantity: 1, unitPrice: 900 }),
      makeItem({ quoteId: 'q-new', quantity: 1, unitPrice: 300 }),
      makeItem({ quoteId: 'q-draft', quantity: 1, unitPrice: 300 }),
    ];

    const data = buildDashboardData(quotes, items, [], 0);

    expect(data.estimatedMonthlyRecurring).toBe(100);
  });

  it('passes recent quotes through unchanged', () => {
    const recent = [makeQuote({ id: 'q-recent' })];
    const data = buildDashboardData([], [], recent, 0);

    expect(data.recentQuotes).toBe(recent);
  });
});
