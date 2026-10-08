/**
 * Money helpers to avoid floating-point rounding errors.
 *
 * All calculations internally use integer cents. The public API surface
 * (DB columns, frontend props) still receives and returns decimal euros,
 * so no database migration is required at this stage.
 *
 * 1 EUR = 100 cents.
 */

export const CENTS_PER_EURO = 100;

/** Round a decimal euro value to the nearest cent and return cents. */
export function eurosToCents(euros) {
  if (euros === null || euros === undefined) return null;
  const n = Number(euros);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * CENTS_PER_EURO);
}

/** Convert cents back to decimal euros. */
export function centsToEuros(cents) {
  if (cents === null || cents === undefined) return 0;
  return Math.round(cents) / CENTS_PER_EURO;
}

/** Add VAT factor to a net cent amount. */
export function addVatCents(netCents, vatRate) {
  const factor = 1 + vatRate;
  return Math.round(netCents * factor);
}

/** Remove VAT from a gross cent amount. */
export function removeVatCents(grossCents, vatRate) {
  if (grossCents === 0) return 0;
  const factor = 1 + vatRate;
  return Math.round(grossCents / factor);
}

/** Compute discount in cents from a net subtotal and discount config. */
export function computeDiscountCents(subtotalCents, discountType, discountValue) {
  let discountCents = 0;
  if (discountType === 'percent') {
    discountCents = Math.round(subtotalCents * (discountValue / 100));
  } else if (discountType === 'amount') {
    discountCents = eurosToCents(discountValue) ?? 0;
  }
  return Math.max(0, Math.min(discountCents, subtotalCents));
}

/** Format cents as German EUR string for quick logging. */
export function formatCents(cents) {
  const euros = centsToEuros(cents);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros);
}
