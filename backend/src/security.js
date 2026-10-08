import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Harden HTTP headers. In production this removes/disables several
 * browser features that can be abused (XSS filter, content sniffing,
 * referrer leakage, etc.). Development keeps a relaxed CSP so Vite HMR
 * and local debugging still work.
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: isProduction ? undefined : false,
});

export const apiRateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/api/health',
};

export const writeRateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please try again later.' },
};

export const seedRateLimitConfig = {
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Seed endpoint is rate limited. Please wait before retrying.' },
};

/**
 * General API rate limiter. Applied to all /api routes.
 * Uses the request IP as the key and returns standardized RateLimit headers.
 */
export const apiRateLimiter = rateLimit(apiRateLimitConfig);

/**
 * Stricter limiter for write-heavy endpoints. Applied on top of the
 * general limiter so both count against the client.
 */
export const writeRateLimiter = rateLimit(writeRateLimitConfig);

/**
 * Very strict limiter for dangerous operations (seed). One attempt per
 * minute per IP is enough for a manual setup step.
 */
export const seedRateLimiter = rateLimit(seedRateLimitConfig);

export function isSeedAllowed() {
  return process.env.NODE_ENV !== 'production';
}
