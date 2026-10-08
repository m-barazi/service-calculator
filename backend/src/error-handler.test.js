import { describe, it, expect, vi } from 'vitest';
import { notFoundHandler, errorHandler, asyncHandler } from './error-handler.js';

describe('error-handler', () => {
  describe('notFoundHandler', () => {
    it('returns a 404 JSON response with the path', () => {
      const req = { path: '/api/missing' };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found', path: '/api/missing' });
    });
  });

  describe('errorHandler', () => {
    it('returns the error message for 4xx errors', () => {
      const err = new Error('Bad thing');
      err.status = 400;
      const req = { method: 'POST', path: '/api/services' };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Bad thing' });
    });

    it('masks internal errors for 5xx responses', () => {
      const err = new Error('database exploded');
      const req = { method: 'GET', path: '/api/services' };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('includes validation details for ValidationError instances', () => {
      const err = new Error('Invalid request body');
      err.name = 'ValidationError';
      err.status = 400;
      err.details = [{ path: ['name'], message: 'Required' }];
      const req = { method: 'POST', path: '/api/services' };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid request body',
        details: [{ path: ['name'], message: 'Required' }],
      });
    });
  });

  describe('asyncHandler', () => {
    it('forwards rejected promises to next', async () => {
      const err = new Error('boom');
      const fn = vi.fn().mockRejectedValue(err);
      const wrapped = asyncHandler(fn);
      const req = {};
      const res = {};
      const next = vi.fn();

      await wrapped(req, res, next);

      expect(fn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
