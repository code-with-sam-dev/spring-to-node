import { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';

/**
 * EPISODE 21. The counter lives in Redis, so every instance counts the same hits. A fixed window:
 * the first hit creates the key with the window's expiry, every hit increments it.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(key: string, ttl: number, limit: number) {
    const replies = await this.redis.multi().incr(key).pexpire(key, ttl, 'NX').pttl(key).exec();
    const totalHits = Number(replies![0][1]);
    const seconds = Math.ceil(Number(replies![2][1]) / 1000);
    const isBlocked = totalHits > limit;
    return { totalHits, timeToExpire: seconds, isBlocked, timeToBlockExpire: isBlocked ? seconds : 0 };
  }
}
