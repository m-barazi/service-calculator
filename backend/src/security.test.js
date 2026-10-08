import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  helmetMiddleware,
  apiRateLimiter,
  writeRateLimiter,
  seedRateLimiter,
  apiRateLimitConfig,
  writeRateLimitConfig,
  seedRateLimitConfig,
  isSeedAllowed,
} from './security.js';

describe('security helpers', () => {
  let originalNodeEnv;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.unstubAllGlobals();
  });

  describe('isSeedAllowed', () => {
    it('returns false in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isSeedAllowed()).toBe(false);
    });

    it('returns true in development', () => {
      process.env.NODE_ENV = 'development';
      expect(isSeedAllowed()).toBe(true);
    });

    it('returns true when NODE_ENV is unset', () => {
      delete process.env.NODE_ENV;
      expect(isSeedAllowed()).toBe(true);
    });
  });

  describe('rate limiters', () => {
    it('exports configured middleware functions', () => {
      expect(typeof helmetMiddleware).toBe('function');
      expect(typeof apiRateLimiter).toBe('function');
      expect(typeof writeRateLimiter).toBe('function');
      expect(typeof seedRateLimiter).toBe('function');
    });

    it('api rate limiter skips the health endpoint', () => {
      expect(apiRateLimitConfig.skip).toBeDefined();
      expect(apiRateLimitConfig.skip({ path: '/api/health' })).toBe(true);
      expect(apiRateLimitConfig.skip({ path: '/api/services' })).toBe(false);
    });

    it('rate limiters have reasonable windows and caps', () => {
      expect(apiRateLimitConfig.windowMs).toBe(15 * 60 * 1000);
      expect(apiRateLimitConfig.max).toBe(200);
      expect(writeRateLimitConfig.windowMs).toBe(15 * 60 * 1000);
      expect(writeRateLimitConfig.max).toBe(60);
      expect(seedRateLimitConfig.windowMs).toBe(60 * 1000);
      expect(seedRateLimitConfig.max).toBe(1);
    });

    it('rate limiters return standardized headers', () => {
      expect(apiRateLimitConfig.standardHeaders).toBe(true);
      expect(writeRateLimitConfig.standardHeaders).toBe(true);
      expect(seedRateLimitConfig.standardHeaders).toBe(true);
      expect(apiRateLimitConfig.legacyHeaders).toBe(false);
      expect(writeRateLimitConfig.legacyHeaders).toBe(false);
      expect(seedRateLimitConfig.legacyHeaders).toBe(false);
    });
  });
});
