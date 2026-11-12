function errorHandler(err, req, res, next) {
  // Validation errors from zod are the caller's mistake, not a server fault.
  if (err && err.name === 'ZodError' && Array.isArray(err.issues)) {
    const first = err.issues[0];
    const field = first && first.path && first.path.length ? `${first.path.join('.')}: ` : '';
    return res.status(400).json({
      error: first ? `${field}${first.message}` : 'Invalid request.',
      code: 'VALIDATION_ERROR',
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error.';

  if (status >= 500) {
    console.error('[Error]', err);
  }

  res.status(status).json({ error: message });
}

/** Wraps async route handlers so errors propagate to errorHandler. */
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, catchAsync };
