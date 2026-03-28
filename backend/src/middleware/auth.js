const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const prisma = require('../config/database');

/**
 * Verify JWT and attach user to request
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) throw new AppError('Authentication required', 401);

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isEmailVerified: true },
  });

  if (!user) throw new AppError('User no longer exists', 401);

  req.user = user;
  next();
};

/**
 * Restrict access to specific roles
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  next();
};

/**
 * Require email verification before action
 */
const requireVerified = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    throw new AppError('Please verify your email address before continuing', 403);
  }
  next();
};

module.exports = { protect, restrictTo, requireVerified };
