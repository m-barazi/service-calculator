import { Router } from 'express';
import { pool } from './db.js';
import { toCamelQuote } from './transforms.js';
import { asyncHandler } from './error-handler.js';

const VAT_RATE = 0.19;

export const dashboardRouter = Router();

/**
 * Build the dashboard payload from SQL-aggregated data.
 *
 * The heavy aggregation (status counts, accepted totals, top services,
 * 90-day revenue) is done in Postgres so only a handful of rows travel
 * across the wire.
 */
export function buildDashboardData(aggregated, vatRate) {
  const vatFactor = 1 + vatRate;

  return {
    quoteCount: aggregated.quoteCount,
    quoteStatusCounts: aggregated.quoteStatusCounts,
    acceptedTotalNet: aggregated.acceptedTotalNet,
    acceptedTotalGross: aggregated.acceptedTotalNet * vatFactor,
    estimatedMonthlyRecurring: aggregated.accepted90DayGross / 3,
    topServices: aggregated.topServices,
    recentQuotes: aggregated.recentQuotes,
  };
}

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const quoteCountResult = await client.query('SELECT COUNT(*) FROM quotes');
      const quoteCount = parseInt(quoteCountResult.rows[0].count);

      const quoteStatusResult = await client.query('SELECT status, COUNT(*) FROM quotes GROUP BY status');
      const quoteStatusCounts = Object.fromEntries(
        quoteStatusResult.rows.map((row) => [row.status, parseInt(row.count)]),
      );

      const acceptedTotalResult = await client.query(
        `SELECT COALESCE(SUM(total_net), 0) AS accepted_total_net
         FROM quotes
         WHERE status = 'angenommen'`,
      );
      const acceptedTotalNet = parseFloat(acceptedTotalResult.rows[0].accepted_total_net ?? 0);

      const accepted90DayResult = await client.query(
        `SELECT COALESCE(SUM(total_gross), 0) AS accepted_90_gross
         FROM invoices
         WHERE status = 'bezahlt'
           AND paid_at >= NOW() - INTERVAL '90 days'`,
      );
      const accepted90DayGross = parseFloat(accepted90DayResult.rows[0].accepted_90_gross ?? 0);

      const topServicesResult = await client.query(
        `SELECT s.id, s.name, COUNT(*) AS count, SUM(qi.total_gross) AS total_gross
         FROM quote_items qi
         JOIN services s ON s.id = qi.service_id
         JOIN quotes q ON q.id = qi.quote_id
         WHERE q.status = 'angenommen'
         GROUP BY s.id, s.name
         ORDER BY total_gross DESC
         LIMIT 5`,
      );
      const topServices = topServicesResult.rows.map((row) => ({
        serviceId: row.id,
        name: row.name,
        count: parseInt(row.count),
        totalGross: parseFloat(row.total_gross ?? 0),
      }));

      const recentQuotesResult = await client.query(
        `SELECT q.*, c.name AS customer_name, p.name AS project_name
         FROM quotes q
         LEFT JOIN customers c ON c.id = q.customer_id
         LEFT JOIN projects p ON p.id = q.project_id
         ORDER BY q.created_at DESC
         LIMIT 5`,
      );
      const recentQuotes = recentQuotesResult.rows.map(toCamelQuote);

      await client.query('COMMIT');

      res.json(
        buildDashboardData(
          { quoteCount, quoteStatusCounts, acceptedTotalNet, accepted90DayGross, topServices, recentQuotes },
          VAT_RATE,
        ),
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);
