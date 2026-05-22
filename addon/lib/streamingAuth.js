'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.STREAMING_JWT_SECRET || 'streaming-secret-change-me';
const JWT_EXPIRY = '7d';

/**
 * Express middleware that authenticates streaming requests via JWT.
 *
 * Reads the token from:
 *   1. Authorization header — "Bearer <token>"
 *   2. `streaming_token` cookie
 *
 * On success, attaches `req.streamingUser = { id, username, email }` and calls next().
 * On failure, responds with 401 JSON.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticateStreaming(req, res, next) {
  let token = null;

  // Prefer Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // Fall back to cookie
  if (!token && req.cookies && req.cookies.streaming_token) {
    token = req.cookies.streaming_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = verifyStreamingToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.streamingUser = {
    id: payload.id,
    username: payload.username,
    email: payload.email,
  };

  next();
}

/**
 * Signs a JWT with a 7-day expiry.
 *
 * @param {object} payload - Data to encode in the token.
 * @returns {string} Signed JWT string.
 */
function signStreamingToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verifies a JWT and returns its decoded payload, or null if invalid/expired.
 *
 * @param {string} token
 * @returns {object|null} Decoded payload or null.
 */
function verifyStreamingToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_err) {
    return null;
  }
}

module.exports = {
  authenticateStreaming,
  signStreamingToken,
  verifyStreamingToken,
};
