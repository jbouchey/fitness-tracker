require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

module.exports = {
  DATABASE_URL:     process.env.DATABASE_URL,
  JWT_SECRET:       process.env.JWT_SECRET,
  JWT_EXPIRES_IN:   process.env.JWT_EXPIRES_IN || '7d',
  PORT:             parseInt(process.env.PORT) || 3001,
  NODE_ENV:         process.env.NODE_ENV || 'development',
  CLIENT_URL:       process.env.CLIENT_URL || 'http://localhost:5173',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB) || 50,
  RESEND_API_KEY: process.env.RESEND_API_KEY || null,
  APP_URL:    process.env.APP_URL    || 'http://localhost:5173',
  REQUIRE_EMAIL_VERIFICATION: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
  STRAVA_CLIENT_ID:            process.env.STRAVA_CLIENT_ID            || null,
  STRAVA_CLIENT_SECRET:        process.env.STRAVA_CLIENT_SECRET        || null,
  STRAVA_WEBHOOK_VERIFY_TOKEN: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || null,
  // Optional: the id Strava returned when the webhook subscription was created.
  // When set, webhook events carrying any other subscription id are ignored.
  STRAVA_WEBHOOK_SUBSCRIPTION_ID: process.env.STRAVA_WEBHOOK_SUBSCRIPTION_ID || null,
  // How many reverse proxies sit in front of the server (nginx = 1, Cloudflare Tunnel + nginx = 2).
  // Rate limits are per visitor address, so this has to be right or every visitor shares one limit.
  TRUST_PROXY: Number.isInteger(parseInt(process.env.TRUST_PROXY)) ? parseInt(process.env.TRUST_PROXY) : 1,
  // Set to "false" to stop new sign-ups without taking the app down.
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION !== 'false',
  UPLOADS_PER_HOUR: parseInt(process.env.UPLOADS_PER_HOUR) || 30,
  EMAIL_FROM: process.env.EMAIL_FROM || 'TrailTracker <noreply@notifications.sierradegroff.com>',
};
