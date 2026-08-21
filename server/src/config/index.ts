import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'reachinbox_secret_key_2026',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
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
