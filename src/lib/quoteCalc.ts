import type { QuoteItem, QuoteLineComputation, QuoteTotals, Service } from '../types'
import { toCents, toEuros, addVatCents, computeDiscountCents } from './cents'

export function computeQuoteLine(
  item: QuoteItem,
  vatRate: number,
): QuoteLineComputation {
  const lineNetCents = toCents(item.unitPrice) * item.quantity
  const lineGrossCents = addVatCents(lineNetCents, vatRate)
  return { item, service: item.service, lineNet: toEuros(lineNetCents), lineGross: toEuros(lineGrossCents) }
}

export function computeQuoteTotals(
  items: QuoteItem[],
  vatRate: number,
  discountType?: string,
  discountValue?: number,
): QuoteTotals {
  const lines = items.map((item) => computeQuoteLine(item, vatRate))

  const subtotalNetCents = lines.reduce((s, l) => s + toCents(l.lineNet), 0)
  const discountAmountCents = computeDiscountCents(subtotalNetCents, discountType as 'percent' | 'amount' | undefined, discountValue ?? 0)
  const totalNetCents = Math.max(0, subtotalNetCents - discountAmountCents)
  const totalGrossCents = addVatCents(totalNetCents, vatRate)
  const vatAmountCents = totalGrossCents - totalNetCents

  return {
    subtotalNet: toEuros(subtotalNetCents),
    discountAmount: toEuros(discountAmountCents),
    totalNet: toEuros(totalNetCents),
    vatAmount: toEuros(vatAmountCents),
    totalGross: toEuros(totalGrossCents),
    lines,
  }
}

/** Get display name for a quote item (service name or custom name) */
export function getItemName(item: QuoteItem): string {
  return item.service?.name ?? item.customName ?? '(Unbenannt)'
}