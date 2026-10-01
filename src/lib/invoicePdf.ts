import type { InvoiceWithItems, QuoteWithItems, Settings } from '../types'
import { computeQuoteTotals } from './quoteCalc'
import { generateQuotePdf } from './quotePdf'

export function generateInvoicePdf(invoice: InvoiceWithItems, settings: Settings): void {
  const quoteLike: QuoteWithItems = {
    ...(invoice.quote || {}),
    id: invoice.quote?.id ?? invoice.id,
    quoteNumber: invoice.invoiceNumber,
    title: invoice.title,
    customerId: invoice.customerId ?? invoice.quote?.customerId,
    customerName: invoice.customerName ?? invoice.quote?.customerName,
    customer: invoice.customer ?? invoice.quote?.customer,
    projectId: invoice.projectId ?? invoice.quote?.projectId,
    projectName: invoice.projectName ?? invoice.quote?.projectName,
    project: invoice.project ?? invoice.quote?.project,
    status: invoice.quote?.status ?? 'accepted',
    discountType: invoice.quote?.discountType,
    discountValue: invoice.quote?.discountValue ?? 0,
    notes: invoice.notes,
    validUntil: undefined,
    items: invoice.items,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  }

  const totals = computeQuoteTotals(
    invoice.items,
    settings.vatRate,
    quoteLike.discountType,
    quoteLike.discountValue,
  )

  generateQuotePdf(quoteLike, totals, settings, {
    mode: 'customer',
    showProfit: false,
    documentTitle: 'RECHNUNG',
    documentNumber: invoice.invoiceNumber,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
  })
}
