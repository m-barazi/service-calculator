import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { mockPool } from './test-helpers.js';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockImplementation((plain, hash) => Promise.resolve(plain === 'securePass123' && hash === 'hashed-password')),
  },
}));

describe('Auth endpoints', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-for-auth-tests';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token', async () => {
      mockPool([
        { rows: [] },
        {
          rows: [
            {
              id: 'u-1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'securePass123', name: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.token).toBeDefined();
    });

    it('rejects weak passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password must be at least 8 characters');
    });

    it('rejects duplicate emails', async () => {
      mockPool([{ rows: [{ id: 'u-1' }] }]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'securePass123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });

    it('returns 503 when JWT_SECRET is not configured', async () => {
      const original = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'securePass123' });
      process.env.JWT_SECRET = original;

      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns a token for valid credentials', async () => {
      mockPool([
        {
          rows: [
            {
              id: 'u-1',
              email: 'test@example.com',
              password_hash: 'hashed-password',
              name: 'Test User',
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'securePass123' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.token).toBeDefined();
    });

    it('rejects invalid credentials', async () => {
      mockPool([
        {
          rows: [
            {
              id: 'u-1',
              email: 'test@example.com',
              password_hash: 'hashed-password',
              name: 'Test User',
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });
  });
});
