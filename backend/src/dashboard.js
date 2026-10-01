/**
 * Build the dashboard payload from SQL-aggregated data.
 *
 * The heavy aggregation (status counts, accepted totals, top services,
 * 90-day revenue) is done in Postgres so only a handful of rows travel
 * across the wire.
 *
 * @param {object} aggregated
 * @param {number} aggregated.quoteCount
 * @param {Record<string, number>} aggregated.quoteStatusCounts
 * @param {number} aggregated.acceptedTotalNet
 * @param {number} aggregated.accepted90DayGross
 * @param {Array<{serviceId: string; name: string; count: number; totalGross: number}>} aggregated.topServices
 * @param {any[]} aggregated.recentQuotes
 * @param {number} vatRate
 */
export function buildDashboardData(aggregated, vatRate) {
  const vatFactor = 1 + vatRate;

  return {
    quoteCount: aggregated.quoteCount,
    quoteStatusCounts: aggregated.quoteStatusCounts,
    acceptedTotalNet: aggregated.acceptedTotalNet,
    acceptedTotalGross: aggregated.acceptedTotalNet * vatFactor,
    estimatedMonthlyRecurring: aggregated.accepted90DayGross / 3,
    topServices: aggregated.topServices,
    recentQuotes: aggregated.recentQuotes,
  };
}
