import { describe, it, expect } from 'vitest';
import { buildDashboardData } from './dashboard.js';

function makeAggregated(overrides = {}) {
  return {
    quoteCount: 0,
    quoteStatusCounts: { draft: 0, sent: 0, accepted: 0, rejected: 0 },
    acceptedTotalNet: 0,
    accepted90DayGross: 0,
    topServices: [],
    recentQuotes: [],
    ...overrides,
  };
}

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

describe('buildDashboardData', () => {
  it('passes through counts and status distribution', () => {
    const data = makeAggregated({
      quoteCount: 8,
      quoteStatusCounts: { draft: 2, sent: 3, accepted: 2, rejected: 1 },
    });

    const result = buildDashboardData(data, 0.19);

    expect(result.quoteCount).toBe(8);
    expect(result.quoteStatusCounts).toEqual({ draft: 2, sent: 3, accepted: 2, rejected: 1 });
  });

  it('applies VAT factor to accepted net total', () => {
    const data = makeAggregated({ acceptedTotalNet: 300 });

    const result = buildDashboardData(data, 0.19);

    expect(result.acceptedTotalNet).toBe(300);
    expect(result.acceptedTotalGross).toBeCloseTo(357, 1);
  });

  it('uses zero VAT when vatRate is 0', () => {
    const data = makeAggregated({ acceptedTotalNet: 250 });

    const result = buildDashboardData(data, 0);

    expect(result.acceptedTotalNet).toBe(250);
    expect(result.acceptedTotalGross).toBe(250);
  });

  it('calculates estimated monthly recurring from 90-day gross', () => {
    const data = makeAggregated({ accepted90DayGross: 600 });

    const result = buildDashboardData(data, 0);

    expect(result.estimatedMonthlyRecurring).toBe(200);
  });

  it('returns top services unchanged', () => {
    const topServices = [
      { serviceId: 's-1', name: 'Service A', count: 10, totalGross: 1190 },
      { serviceId: 's-2', name: 'Service B', count: 5, totalGross: 595 },
    ];

    const result = buildDashboardData(makeAggregated({ topServices }), 0.19);

    expect(result.topServices).toEqual(topServices);
  });

  it('passes recent quotes through unchanged', () => {
    const recent = [makeQuote({ id: 'q-recent' })];

    const result = buildDashboardData(makeAggregated({ recentQuotes: recent }), 0);

    expect(result.recentQuotes).toBe(recent);
  });

  it('returns a complete dashboard payload with default values', () => {
    const result = buildDashboardData(makeAggregated(), 0.19);

    expect(result).toMatchObject({
      quoteCount: 0,
      quoteStatusCounts: { draft: 0, sent: 0, accepted: 0, rejected: 0 },
      acceptedTotalNet: 0,
      acceptedTotalGross: 0,
      estimatedMonthlyRecurring: 0,
      topServices: [],
      recentQuotes: [],
    });
  });
});
