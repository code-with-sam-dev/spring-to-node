import { Injectable } from '@nestjs/common';
import { LockAcquireResult, LockStore, LocksStorage } from '@nestjs/locks';
import { Redis } from 'ioredis';

/**
 * EPISODE 25. A LockStore on Redis: every operation one Lua script, so it is atomic, with Redis's
 * own clock measuring the ttl and one INCR counter per key for the fencing token.
 */
const ACQUIRE = `if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then return redis.call('INCR', KEYS[2]) end return 0`;
const RENEW = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) end return 0`;
const RELEASE = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`;

@Injectable()
export class RedisLockStore implements LockStore {
  constructor(
    private readonly redis: Redis,
    storage: LocksStorage,
  ) {
    storage.registerSource(this);
  }

  async acquire(key: string, owner: string, ttl: number): Promise<LockAcquireResult> {
    const token = Number(await this.redis.eval(ACQUIRE, 2, `lock:${key}`, `fence:${key}`, owner, ttl));
    return token > 0 ? { acquired: true, fencingToken: token } : { acquired: false };
  }

  async renew(key: string, owner: string, ttl: number) {
    return Number(await this.redis.eval(RENEW, 1, `lock:${key}`, owner, ttl)) === 1;
  }

  async release(key: string, owner: string) {
    return Number(await this.redis.eval(RELEASE, 1, `lock:${key}`, owner)) === 1;
  }
}
