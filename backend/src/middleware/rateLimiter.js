const rateLimit = require('express-rate-limit');

// In development, use a pass-through middleware to avoid rate limit frustrations
const isDev = process.env.NODE_ENV !== 'production';
const passThrough = (_req, _res, next) => next();

const generalLimiter = isDev ? passThrough : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = isDev ? passThrough : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

module.exports = { generalLimiter, authLimiter };
