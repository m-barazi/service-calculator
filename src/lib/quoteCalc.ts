import type { QuoteItem, QuoteLineComputation, QuoteTotals, Service } from '../types'

export function computeQuoteLine(
  item: QuoteItem,
  vatRate: number,
): QuoteLineComputation {
  const lineNet = item.quantity * item.unitPrice
  const lineGross = lineNet * (1 + vatRate)
  return { item, service: item.service, lineNet, lineGross }
}

export function computeQuoteTotals(
  items: QuoteItem[],
  vatRate: number,
  discountType?: string,
  discountValue?: number,
): QuoteTotals {
  const lines = items.map((item) => computeQuoteLine(item, vatRate))

  const subtotalNet = lines.reduce((s, l) => s + l.lineNet, 0)

  let discountAmount = 0
  if (discountType === 'percent' && discountValue) {
    discountAmount = subtotalNet * (discountValue / 100)
  } else if (discountType === 'amount' && discountValue) {
    discountAmount = discountValue
  }

  const totalNet = subtotalNet - discountAmount
  const vatAmount = totalNet * vatRate
  const totalGross = totalNet + vatAmount

  return {
    subtotalNet,
    discountAmount,
    totalNet,
    vatAmount,
    totalGross,
    lines,
  }
}

/** Get display name for a quote item (service name or custom name) */
export function getItemName(item: QuoteItem): string {
  return item.service?.name ?? item.customName ?? '(Unbenannt)'
}