import type { CartItem, CartTotals, LineComputation, Service } from '../types'

export function computeLine(
  service: Service,
  quantity: number,
  vatRate: number,
): Omit<LineComputation, 'note'> {
  const safeQty = Math.max(0, quantity)
  const totalCostNet = service.purchasePrice * safeQty
  const totalCostGross = totalCostNet * (1 + vatRate)
  const totalSaleNet = service.salePrice * safeQty
  const totalSaleGross = totalSaleNet * (1 + vatRate)
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
  discountType?: import('../types').CartDiscountType,
  discountValue: number = 0,
): CartTotals {
  const serviceMap = new Map(services.map((s) => [s.id, s]))
  const lines: LineComputation[] = []

  for (const item of cart) {
    if (item.quantity <= 0) continue
    const svc = serviceMap.get(item.serviceId)
    if (!svc) continue
    lines.push({
      ...computeLine(svc, item.quantity, vatRate),
      note: item.note,
    })
  }

  const totalCostNet = lines.reduce((s, l) => s + l.totalCostNet, 0)
  const totalCostGross = lines.reduce((s, l) => s + l.totalCostGross, 0)
  const totalSaleNet = lines.reduce((s, l) => s + l.totalSaleNet, 0)
  const totalSaleGross = lines.reduce((s, l) => s + l.totalSaleGross, 0)
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0)

  let discountAmount = 0
  if (discountType === 'percent') {
    discountAmount = totalSaleNet * (discountValue / 100)
  } else if (discountType === 'amount') {
    discountAmount = discountValue
  }
  discountAmount = Math.min(discountAmount, totalSaleNet)
  discountAmount = Math.max(0, discountAmount)

  const discountedSaleNet = Math.max(0, totalSaleNet - discountAmount)
  const discountedSaleGross = discountedSaleNet * (1 + vatRate)
  const profitNet = discountedSaleNet - totalCostNet
  const profitMarginPct = discountedSaleNet > 0 ? profitNet / discountedSaleNet : 0

  return {
    lines,
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
