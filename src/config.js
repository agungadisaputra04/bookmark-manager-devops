require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  databaseUrl: required('DATABASE_URL'),
  pgSsl: process.env.PGSSL === 'true',

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  linkCheckCron: process.env.LINK_CHECK_CRON || '*/15 * * * *',
  linkCheckTimeoutMs: parseInt(process.env.LINK_CHECK_TIMEOUT_MS || '5000', 10),
  linkCheckConcurrency: parseInt(process.env.LINK_CHECK_CONCURRENCY || '5', 10),
};
