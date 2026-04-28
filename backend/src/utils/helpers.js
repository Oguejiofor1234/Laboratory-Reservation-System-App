const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Generate a cryptographically random token
 */
const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

/**
 * Generate JWT access token
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

/**
 * Parse pagination query params
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build paginated response object
 */
const paginatedResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});

/**
 * Check if two time windows overlap
 */
const timesOverlap = (start1, end1, start2, end2) => start1 < end2 && end1 > start2;

/**
 * Set refresh token as httpOnly cookie
 */
// secure:true requires HTTPS — only enable when COOKIE_SECURE env var is set.
// On HTTP deployments (EB without TLS) leave COOKIE_SECURE unset so the
// browser stores the cookie. Set COOKIE_SECURE=true once HTTPS is configured.
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   COOKIE_SECURE,
    sameSite: COOKIE_SECURE ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Clear refresh token cookie
 */
const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   COOKIE_SECURE,
    sameSite: COOKIE_SECURE ? 'strict' : 'lax',
  });
};

module.exports = {
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  parsePagination,
  paginatedResponse,
  timesOverlap,
  setRefreshCookie,
  clearRefreshCookie,
};
