const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const toBool = (value, fallback = false) =>
  value === undefined ? fallback : ['true', '1', 'yes'].includes(String(value).toLowerCase());

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || '',
  useInMemoryDb: toBool(process.env.USE_IN_MEMORY_DB),
  seedOnStart: toBool(process.env.SEED_ON_START),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: toBool(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'BookEase <no-reply@bookease.local>',
  },
  cancellationWindowHours: Number(process.env.CANCELLATION_WINDOW_HOURS ?? 2),
  bookingHorizonDays: Number(process.env.BOOKING_HORIZON_DAYS ?? 60),
};

env.isTest = env.nodeEnv === 'test';
env.isProduction = env.nodeEnv === 'production';

if (env.isProduction && env.jwtSecret.startsWith('dev-only')) {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
