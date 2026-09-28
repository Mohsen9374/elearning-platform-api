const path = require('path');
require('dotenv').config({ quiet: true });

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  upload: {
    dir: path.resolve(process.env.UPLOAD_DIR || 'public/uploads'),
    maxImageSize: 2 * 1024 * 1024, // 2 MB
  },
};
