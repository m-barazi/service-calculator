import { describe, it, expect } from 'vitest';
import { parsePagination, buildListResponse } from './pagination.js';

describe('pagination helpers', () => {
  describe('parsePagination', () => {
    it('defaults to page 1 and limit 25', () => {
      expect(parsePagination({})).toEqual({ page: 1, limit: 25, offset: 0 });
    });

    it('parses valid page and limit', () => {
      expect(parsePagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, offset: 20 });
    });

    it('clamps limit to 100', () => {
      expect(parsePagination({ limit: '500' })).toEqual({ page: 1, limit: 100, offset: 0 });
    });

    it('ignores invalid or negative values', () => {
      expect(parsePagination({ page: '-2', limit: 'abc' })).toEqual({ page: 1, limit: 25, offset: 0 });
    });
  });

  describe('buildListResponse', () => {
    it('builds response with pagination metadata', () => {
      const rows = [{ id: 1 }, { id: 2 }];
      expect(buildListResponse(rows, 50, 2, 10)).toEqual({
        data: rows,
        pagination: { page: 2, limit: 10, total: 50, totalPages: 5 },
      });
    });

    it('rounds totalPages up', () => {
      expect(buildListResponse([], 11, 1, 10).pagination.totalPages).toBe(2);
    });
  });
});
