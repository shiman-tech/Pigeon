import Redis from 'ioredis';
import { config } from './index';

export const redisConnection = config.redis.url
  ? new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      tls: config.redis.tls,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});
