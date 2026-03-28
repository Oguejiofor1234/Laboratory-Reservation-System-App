const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, isOperational } = err;

  // Prisma known errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A record with this value already exists';
    isOperational = true;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
    isOperational = true;
  } else if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Related record not found';
    isOperational = true;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    isOperational = true;
  }

  // Log non-operational errors (programming errors)
  if (!isOperational) {
    logger.error('UNHANDLED ERROR:', err);
  }

  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      message,
      error: err,
      stack: err.stack,
    });
  } else {
    res.status(statusCode).json({
      success: false,
      message: isOperational ? message : 'Something went wrong',
    });
  }
};

module.exports = errorHandler;
