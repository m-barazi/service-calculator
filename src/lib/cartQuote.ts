import type { Service, CartItem, CartEntry } from '../types'

export type CartMap = Record<string, CartEntry>

export interface BuildQuoteItemInput {
  serviceId: string
  unitPrice: number
  quantity: number
  customNote?: string
  sortOrder: number
}

export function buildCartQuoteItems(
  cart: CartMap,
  services: Service[],
): BuildQuoteItemInput[] {
  const entries = Object.entries(cart)
  let sortOrder = 0
  const items: BuildQuoteItemInput[] = []

  for (const [serviceId, entry] of entries) {
    const service = services.find((s) => s.id === serviceId)
    if (!service || entry.quantity <= 0) continue
    items.push({
      serviceId: service.id,
      unitPrice: entry.unitPrice ?? service.salePrice,
      quantity: entry.quantity,
      customNote: entry.note || undefined,
      sortOrder: sortOrder++,
    })
  }

  return items
}

export function cartToItems(cart: CartMap): CartItem[] {
  return Object.entries(cart).map(([serviceId, entry]) => ({
    serviceId,
    quantity: entry.quantity,
    note: entry.note,
    unitPrice: entry.unitPrice,
  }))
}
