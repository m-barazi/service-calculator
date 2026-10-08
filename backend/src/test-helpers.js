import { vi } from 'vitest';
import { pool } from './db.js';

/**
 * Replace pool.query with a deterministic mock.
 * `responses` is an array of results returned in order for each call.
 * Each result can be `{ rows: [...] }` or a function `(sql, params) => ({ rows: [...] })`.
 */
export function mockPool(responses = []) {
  let callIndex = 0;
  return vi.spyOn(pool, 'query').mockImplementation(async (sql, params) => {
    const response = responses[callIndex++];
    if (typeof response === 'function') {
      return response(sql, params);
    }
    return response ?? { rows: [] };
  });
}
