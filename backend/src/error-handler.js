/**
 * Centralised error handling for the Express API.
 *
 * All route handlers should forward errors via `next(error)` so that this
 * middleware can produce a consistent, safe response and log the details.
 */

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isValidation = err.name === 'ValidationError' || status === 400;

  // Always log the full stack in development and the error summary in production.
  const logLine = {
    method: req.method,
    path: req.path,
    status,
    message: err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  if (status >= 500) {
    console.error('Server error:', logLine);
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('Request issue:', logLine);
  }

  // Never leak internal details to the client for 5xx errors.
  res.status(status).json({
    error: isValidation ? err.message : (status >= 500 ? 'Internal server error' : err.message),
    ...(isValidation && err.details && { details: err.details }),
  });
}

/**
 * Wrap an async route handler so any rejected promise is passed to
 * Express error handling middleware.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
