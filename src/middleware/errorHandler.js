// Centralized error handler. Any error passed via next(err) lands here.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Postgres unique_violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
