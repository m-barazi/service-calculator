import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { asyncHandler } from './error-handler.js';

const TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 12;

function jwtSecret() {
  return process.env.JWT_SECRET;
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret(),
    { expiresIn: TOKEN_EXPIRY },
  );
}

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    if (!jwtSecret()) {
      const error = new Error('Authentication is not configured');
      error.status = 503;
      throw error;
    }

    const { email, password, name } = req.body;
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.status = 400;
      throw error;
    }
    if (password.length < 8) {
      const error = new Error('Password must be at least 8 characters');
      error.status = 400;
      throw error;
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      const error = new Error('Email already registered');
      error.status = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, name, role, created_at, updated_at`,
      [email.trim().toLowerCase(), passwordHash, name || null, 'user'],
    );
    const user = result.rows[0];
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token: signToken(user),
    });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    if (!jwtSecret()) {
      const error = new Error('Authentication is not configured');
      error.status = 503;
      throw error;
    }

    const { email, password } = req.body;
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.status = 400;
      throw error;
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE email = $1',
      [email.trim().toLowerCase()],
    );
    if (result.rows.length === 0) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token: signToken(user),
    });
  }),
);

export function authenticateToken(req, res, next) {
  const secret = jwtSecret();
  if (!secret) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAuth(req, res, next) {
  if (!JWT_SECRET) {
    return next();
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
