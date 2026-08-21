import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'pigeon_secret_key_2026',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: (process.env.REDIS_HOST || 'localhost').replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' || (process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash.io')) ? {} : undefined,
  },

  queue: {
    name: 'email-dispatch-queue',
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  },

  defaults: {
    delaySeconds: parseInt(process.env.DEFAULT_DELAY_SECONDS || '2', 10),
    hourlyLimit: parseInt(process.env.DEFAULT_HOURLY_LIMIT || '200', 10),
  },
};
