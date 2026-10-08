import { pool } from '../db.js';
import {
  centsToEuros,
  eurosToCents,
  addVatCents,
  computeDiscountCents,
} from '../money.js';

export async function computeQuoteTotalsForInvoice(quoteId, vatRate) {
  const result = await pool.query(
    `SELECT
      COALESCE(SUM(qi.quantity * qi.unit_price), 0) AS subtotal,
      q.discount_type,
      q.discount_value
    FROM quotes q
    LEFT JOIN quote_items qi ON q.id = qi.quote_id
    WHERE q.id = $1
    GROUP BY q.id, q.discount_type, q.discount_value`,
    [quoteId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const subtotalCents = eurosToCents(row.subtotal) ?? 0;
  const discountCents = computeDiscountCents(subtotalCents, row.discount_type, row.discount_value);
  const totalNetCents = Math.max(0, subtotalCents - discountCents);
  const totalGrossCents = addVatCents(totalNetCents, vatRate);
  return { totalNet: centsToEuros(totalNetCents), totalGross: centsToEuros(totalGrossCents) };
}
