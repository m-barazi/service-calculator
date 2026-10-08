// Atomic quote/invoice number generation using Postgres sequences.

import { pool } from './db.js';

export async function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const result = await pool.query(`SELECT nextval('quote_number_seq') AS n`);
  const next = parseInt(result.rows[0].n, 10);
  return `AN-${year}-${String(next).padStart(4, '0')}`;
}

export async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const result = await pool.query(`SELECT nextval('invoice_number_seq') AS n`);
  const next = parseInt(result.rows[0].n, 10);
  return `RE-${year}-${String(next).padStart(4, '0')}`;
}
