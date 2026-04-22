// Global error handling middleware (CommonJS)

function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', req.method, req.path, '-', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

class APIError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

function notFoundHandler(req, res, next) {
  next(new APIError(`Route not found: ${req.originalUrl}`, 404));
}

module.exports = { errorHandler, asyncHandler, APIError, notFoundHandler };
