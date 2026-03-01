function errorHandler(err, req, res, next) {
  const status = err.status || 500;
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
