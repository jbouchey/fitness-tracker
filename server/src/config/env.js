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
};
