function quoteTotalNet(quote, items) {
  const quoteItems = items.filter((i) => i.quoteId === quote.id);
  let subtotal = 0;
  for (const item of quoteItems) {
    subtotal += item.quantity * item.unitPrice;
  }

  let discountAmount = 0;
  if (quote.discountType === 'percent') {
    discountAmount = subtotal * (quote.discountValue / 100);
  } else if (quote.discountType === 'amount') {
    discountAmount = quote.discountValue;
  }

  return Math.max(0, subtotal - discountAmount);
}

function quoteTotalGross(quote, items, vatFactor) {
  return quoteTotalNet(quote, items) * vatFactor;
}

export function buildDashboardData(quotes, allItems, recentQuotes, vatRate) {
  const vatFactor = 1 + vatRate;
  const quoteCount = quotes.length;
  const quoteStatusCounts = { draft: 0, sent: 0, accepted: 0, rejected: 0 };

  let acceptedTotalNet = 0;
  let acceptedTotalGross = 0;

  for (const quote of quotes) {
    quoteStatusCounts[quote.status] = (quoteStatusCounts[quote.status] || 0) + 1;
    if (quote.status !== 'accepted') continue;

    const net = quoteTotalNet(quote, allItems);
    acceptedTotalNet += net;
    acceptedTotalGross += net * vatFactor;
  }

  // Top services by appearance in quotes
  const serviceMap = new Map();
  for (const item of allItems) {
    const sid = item.serviceId || item.customName || 'custom';
    const name = item.service ? item.service.name : (item.customName || 'Freitext');
    const existing = serviceMap.get(sid) || { serviceId: sid, name, count: 0, totalGross: 0 };
    existing.count += item.quantity;
    existing.totalGross += item.quantity * item.unitPrice * vatFactor;
    serviceMap.set(sid, existing);
  }
  const topServices = Array.from(serviceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Estimated monthly recurring: accepted gross from last 90 days, annualized to monthly
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  let accepted90DayGross = 0;
  for (const quote of quotes) {
    if (quote.status !== 'accepted') continue;
    const created = new Date(quote.createdAt);
    if (created < ninetyDaysAgo) continue;
    accepted90DayGross += quoteTotalGross(quote, allItems, vatFactor);
  }
  const estimatedMonthlyRecurring = accepted90DayGross / 3;

  return {
    quoteCount,
    quoteStatusCounts,
    acceptedTotalNet,
    acceptedTotalGross,
    estimatedMonthlyRecurring,
    topServices,
    recentQuotes,
  };
}
