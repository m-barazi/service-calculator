import type { CartDiscountType, CartItem, CartItemWithPrice, CartTotals, CategorySubtotal, LineComputation, Service } from '../types'
import { toCents, toEuros, addVatCents, computeDiscountCents } from './cents'

export function computeLine(
  service: Service,
  quantity: number,
  vatRate: number,
  unitPrice?: number,
  purchasePrice?: number,
): Omit<LineComputation, 'note'> {
  const safeQty = Math.max(0, quantity)
  const effectivePurchasePrice = purchasePrice ?? service.purchasePrice
  const effectiveSalePrice = unitPrice ?? service.salePrice

  const costNetCents = toCents(effectivePurchasePrice) * safeQty
  const saleNetCents = toCents(effectiveSalePrice) * safeQty

  const totalCostNet = toEuros(costNetCents)
  const totalCostGross = toEuros(addVatCents(costNetCents, vatRate))
  const totalSaleNet = toEuros(saleNetCents)
  const totalSaleGross = toEuros(addVatCents(saleNetCents, vatRate))
  const profitNet = totalSaleNet - totalCostNet
  const profitMarginPct = totalSaleNet > 0 ? profitNet / totalSaleNet : 0

  return {
    service,
    quantity: safeQty,
    totalCostNet,
    totalCostGross,
    totalSaleNet,
    totalSaleGross,
    profitNet,
    profitMarginPct,
  }
}

export function computeCart(
  cart: CartItem[],
  services: Service[],
  vatRate: number,
  discountType?: CartDiscountType,
  discountValue: number = 0,
): CartTotals {
  const serviceMap = new Map(services.map((s) => [s.id, s]))
  const lines: LineComputation[] = []

  for (const item of cart) {
    if (item.quantity <= 0) continue
    const svc = serviceMap.get(item.serviceId)
    if (!svc) continue
    const withPrice = item as CartItemWithPrice
    lines.push({
      ...computeLine(svc, item.quantity, vatRate, withPrice.unitPrice, withPrice.purchasePrice),
      note: item.note,
    })
  }

  const totalCostNetCents = toCents(lines.reduce((s, l) => s + l.totalCostNet, 0))
  const totalSaleNetCents = toCents(lines.reduce((s, l) => s + l.totalSaleNet, 0))
  const totalSaleGrossCents = addVatCents(totalSaleNetCents, vatRate)
  const totalCostGrossCents = addVatCents(totalCostNetCents, vatRate)
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0)

  // Aggregate subtotals per category, preserving first-appearance order.
  const categoryMap = new Map<string, CategorySubtotal>()
  for (const line of lines) {
    const id = line.service.categoryId
    const existing = categoryMap.get(id)
    if (existing) {
      existing.totalCostNet += line.totalCostNet
      existing.totalCostGross += line.totalCostGross
      existing.totalSaleNet += line.totalSaleNet
      existing.totalSaleGross += line.totalSaleGross
      existing.profitNet += line.profitNet
      existing.itemCount += line.quantity
      existing.lineCount += 1
    } else {
      categoryMap.set(id, {
        categoryId: id,
        totalCostNet: line.totalCostNet,
        totalCostGross: line.totalCostGross,
        totalSaleNet: line.totalSaleNet,
        totalSaleGross: line.totalSaleGross,
        profitNet: line.profitNet,
        itemCount: line.quantity,
        lineCount: 1,
      })
    }
  }
  const categorySubtotals = Array.from(categoryMap.values())

  const discountAmountCents = computeDiscountCents(totalSaleNetCents, discountType, discountValue)
  const discountedSaleNetCents = Math.max(0, totalSaleNetCents - discountAmountCents)
  const discountedSaleGrossCents = addVatCents(discountedSaleNetCents, vatRate)
  const profitNetCents = discountedSaleNetCents - totalCostNetCents

  const totalCostNet = toEuros(totalCostNetCents)
  const totalCostGross = toEuros(totalCostGrossCents)
  const totalSaleNet = toEuros(totalSaleNetCents)
  const totalSaleGross = toEuros(totalSaleGrossCents)
  const discountAmount = toEuros(discountAmountCents)
  const discountedSaleNet = toEuros(discountedSaleNetCents)
  const discountedSaleGross = toEuros(discountedSaleGrossCents)
  const profitNet = toEuros(profitNetCents)
  const profitMarginPct = discountedSaleNet > 0 ? profitNet / discountedSaleNet : 0

  return {
    lines,
    categorySubtotals,
    totalCostNet,
    totalCostGross,
    totalSaleNet,
    totalSaleGross,
    profitNet,
    profitMarginPct,
    itemCount,
    vatRate,
    discountType,
    discountValue,
    discountAmount,
    discountedSaleNet,
    discountedSaleGross,
  }
}
