import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { pool } from './db.js';
import { mockPool } from './test-helpers.js';

describe('API integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('returns status ok with a timestamp', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/services', () => {
    it('returns services as camelCase', async () => {
      mockPool([
        {
          rows: [
            {
              id: 's-1',
              name: 'Website Design',
              category_id: '550e8400-e29b-41d4-a716-446655440000',
              purchase_price: 0,
              sale_price: 252,
              default_quantity: 1,
              url: null,
              note: null,
              visible: true,
              pinned: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ]);

      const res = await request(app).get('/api/services');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: 's-1',
        name: 'Website Design',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        purchasePrice: 0,
        salePrice: 252,
        defaultQuantity: 1,
        visible: true,
      });
    });

    it('handles database errors with a 500 response', async () => {
      mockPool();
      vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('connection lost'));

      const res = await request(app).get('/api/services');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch services');
    });
  });

  describe('POST /api/services', () => {
    it('rejects invalid payloads with 400', async () => {
      const res = await request(app).post('/api/services').send({ name: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('creates a service with valid payload', async () => {
      mockPool([
        {
          rows: [
            {
              id: 's-new',
              name: 'SEO Optimierung',
              category_id: '550e8400-e29b-41d4-a716-446655440000',
              purchase_price: 0,
              sale_price: 120,
              default_quantity: 1,
              url: null,
              note: null,
              visible: true,
              pinned: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ]);

      const res = await request(app).post('/api/services').send({
        name: 'SEO Optimierung',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        purchasePrice: 0,
        salePrice: 120,
        defaultQuantity: 1,
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('s-new');
    });
  });

  describe('POST /api/categories', () => {
    it('rejects missing name', async () => {
      const res = await request(app).post('/api/categories').send({ color: '#fff' });
      expect(res.status).toBe(400);
    });
  });
});
