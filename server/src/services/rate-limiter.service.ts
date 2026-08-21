import { redisConnection } from '../config/redis';

/**
 * Hourly window rate limiter using Redis atomic counter.
 * Key format: `rate_limit:{senderKey}:{yyyy-MM-dd-HH}`
 * TTL: 2 hours (7200 seconds) so old buckets expire automatically.
 */
export class RateLimiterService {
  /**
   * Generates key for current hour window in UTC
   */
  private static getHourlyKey(senderKey: string, date: Date = new Date()): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    return `email_rate_limit:${senderKey}:${yyyy}-${mm}-${dd}-${hh}`;
  }

  /**
   * Checks whether an email can be sent in the current hour window and increments the counter atomically if within limit.
   * If limit is exceeded, returns { allowed: false, currentCount, nextWindowDelayMs }
   */
  public static async checkAndConsume(
    senderKey: string,
    limitPerHour: number
  ): Promise<{
    allowed: boolean;
    currentCount: number;
    limit: number;
    delayUntilNextWindowMs: number;
  }> {
    const now = new Date();
    const key = this.getHourlyKey(senderKey, now);

    // Atomic INCR in Redis
    const count = await redisConnection.incr(key);

    // If first key creation, set 2 hour TTL
    if (count === 1) {
      await redisConnection.expire(key, 7200);
    }

    // Calculate milliseconds until top of the next hour
    const nextHour = new Date(now);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1);
    nextHour.setUTCMinutes(0);
    nextHour.setUTCSeconds(2); // +2s buffer
    nextHour.setUTCMilliseconds(0);

    const delayUntilNextWindowMs = Math.max(1000, nextHour.getTime() - now.getTime());

    if (count > limitPerHour) {
      // Over limit - do not decrement to keep track of demand pressure, or can be left as is.
      return {
        allowed: false,
        currentCount: count,
        limit: limitPerHour,
        delayUntilNextWindowMs,
      };
    }

    return {
      allowed: true,
      currentCount: count,
      limit: limitPerHour,
      delayUntilNextWindowMs: 0,
    };
  }

  /**
   * Get current usage count for current hour window
   */
  public static async getCurrentCount(senderKey: string): Promise<number> {
    const key = this.getHourlyKey(senderKey);
    const countStr = await redisConnection.get(key);
    return countStr ? parseInt(countStr, 10) : 0;
  }
}
