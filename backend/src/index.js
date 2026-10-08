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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: allow configured frontend origin; fall back to any origin only in development.
const FRONTEND_URL = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? null : '*');
const corsOptions = FRONTEND_URL && FRONTEND_URL !== '*'
  ? { origin: FRONTEND_URL, credentials: true }
  : { origin: true };
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

app.use('/api/services', servicesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/quotes', quotesRouter);
// Keep the legacy quote-to-invoice URL working; the invoices router owns the lifecycle.
app.use('/api/quotes/:id/invoice', invoicesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/seed', seedRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

ensureTables().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to ensure database tables:', err);
  process.exit(1);
});
