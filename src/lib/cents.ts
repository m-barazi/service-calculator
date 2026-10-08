// Cent-safe money helpers.
//
// Frontend prices are still stored as decimal euros for backwards compatibility,
// but all arithmetic goes through cents to avoid floating-point drift.

export const CENTS_PER_EURO = 100

/** Round decimal euros to integer cents. */
export function toCents(euros: number): number {
  return Math.round(euros * CENTS_PER_EURO)
}

/** Convert integer cents back to decimal euros. */
export function toEuros(cents: number): number {
  return Math.round(cents) / CENTS_PER_EURO
}

/** Add VAT to a net cent amount. */
export function addVatCents(netCents: number, vatRate: number): number {
  return Math.round(netCents * (1 + vatRate))
}

/** Remove VAT from a gross cent amount. */
export function removeVatCents(grossCents: number, vatRate: number): number {
  if (grossCents === 0) return 0
  return Math.round(grossCents / (1 + vatRate))
}

/** Compute discount in cents from a net subtotal. */
export function computeDiscountCents(
  subtotalCents: number,
  discountType?: 'percent' | 'amount',
  discountValue: number = 0,
): number {
  let discountCents = 0
  if (discountType === 'percent') {
    discountCents = Math.round(subtotalCents * (discountValue / 100))
  } else if (discountType === 'amount') {
    discountCents = toCents(discountValue)
  }
  return Math.max(0, Math.min(discountCents, subtotalCents))
}
