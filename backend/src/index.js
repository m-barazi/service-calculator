import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ensureTables } from './db.js';
import { servicesRouter } from './services.js';
import { categoriesRouter } from './categories.js';
import { customersRouter } from './customers.js';
import { projectsRouter } from './projects.js';
import { quotesRouter } from './quotes/router.js';
import { invoicesRouter } from './invoices.js';
import { dashboardRouter } from './dashboard.js';
import { seedRouter } from './seed.js';
import {
  helmetMiddleware,
  apiRateLimiter,
  writeRateLimiter,
  seedRateLimiter,
  isSeedAllowed,
} from './security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmetMiddleware);

// CORS: allow configured frontend origin; fall back to any origin only in development.
const FRONTEND_URL = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? null : '*');
const corsOptions = FRONTEND_URL && FRONTEND_URL !== '*'
  ? { origin: FRONTEND_URL, credentials: true }
  : { origin: true };
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

// Global API rate limiting. Health checks are excluded.
app.use('/api', apiRateLimiter);

app.use('/api/services', writeRateLimiter, servicesRouter);
app.use('/api/categories', writeRateLimiter, categoriesRouter);
app.use('/api/customers', writeRateLimiter, customersRouter);
app.use('/api/projects', writeRateLimiter, projectsRouter);
app.use('/api/quotes', writeRateLimiter, quotesRouter);
// Keep the legacy quote-to-invoice URL working; the invoices router owns the lifecycle.
app.use('/api/quotes/:id/invoice', writeRateLimiter, invoicesRouter);
app.use('/api/invoices', writeRateLimiter, invoicesRouter);
app.use('/api/dashboard', dashboardRouter);

// The seed endpoint can drop/overwrite data and must never be exposed in production.
if (isSeedAllowed()) {
  app.use('/api/seed', seedRateLimiter, seedRouter);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };

export async function startServer() {
  await ensureTables();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

// Start the server only when this file is executed directly (not imported in tests).
if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error('Failed to ensure database tables:', err);
    process.exit(1);
  });
}
