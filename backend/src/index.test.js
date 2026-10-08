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
      expect(res.body.error).toBe('Internal server error');
    });

    it('returns a paginated response when page or limit is requested', async () => {
      mockPool([
        { rows: [{ count: '42' }] },
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

      const res = await request(app).get('/api/services?page=2&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({ page: 2, limit: 10, total: 42, totalPages: 5 });
    });

    it('filters services by search and category', async () => {
      mockPool([
        { rows: [{ count: '1' }] },
        {
          rows: [
            {
              id: 's-2',
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

      const res = await request(app).get('/api/services?search=seo&categoryId=550e8400-e29b-41d4-a716-446655440000&visible=true&page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('SEO Optimierung');
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/services/stats', () => {
    it('returns total, visible and per-category counts', async () => {
      mockPool([
        { rows: [{ count: '12' }] },
        { rows: [{ count: '8' }] },
        {
          rows: [
            { category_id: '550e8400-e29b-41d4-a716-446655440000', count: '7' },
            { category_id: '550e8400-e29b-41d4-a716-446655440001', count: '5' },
          ],
        },
      ]);

      const res = await request(app).get('/api/services/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalCount: 12,
        visibleCount: 8,
        categoryCounts: [
          { categoryId: '550e8400-e29b-41d4-a716-446655440000', count: 7 },
          { categoryId: '550e8400-e29b-41d4-a716-446655440001', count: 5 },
        ],
      });
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

  describe('GET /api/categories', () => {
    it('returns categories as camelCase', async () => {
      mockPool([
        {
          rows: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Design',
              description: null,
              icon: '🎨',
              color: '#ff0000',
              sort_order: 0,
              visible: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ]);

      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Design',
        sortOrder: 0,
        visible: true,
      });
    });

    it('returns a paginated response when page or limit is requested', async () => {
      mockPool([
        { rows: [{ count: '5' }] },
        {
          rows: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Design',
              description: null,
              icon: '🎨',
              color: '#ff0000',
              sort_order: 0,
              visible: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ]);

      const res = await request(app).get('/api/categories?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({ page: 1, limit: 10, total: 5, totalPages: 1 });
    });
  });

  describe('POST /api/categories', () => {
    it('rejects missing name', async () => {
      const res = await request(app).post('/api/categories').send({ color: '#fff' });
      expect(res.status).toBe(400);
    });
  });
});
