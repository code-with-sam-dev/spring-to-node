import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LocksModule, OnOneInstance } from '@nestjs/locks';
import { Cron, ScheduleModule } from '@nestjs/schedule';
import { Redis } from 'ioredis';
import { RedisLockStore } from './redis-lock-store.js';

/**
 * EPISODE 25, F: one instance as its own process, for the failover probe. A job that takes 4 s,
 * started every second on one instance, lease ttl 3 s, locks in Redis. Prints a line per run so
 * the probe can read it.
 *
 *   node dist/ep24-schedule/failover-instance.js <name> <redisUrl>
 */
const [name, redisUrl] = process.argv.slice(2);

@Injectable()
class Jobs {
  @Cron('* * * * * *')
  @OnOneInstance({ key: 'payments:settle', ttl: '3s' })
  async settle() {
    console.log(`START ${name} ${Date.now()}`);
    await new Promise((r) => setTimeout(r, 4000));
  }
}

@Module({
  imports: [ScheduleModule.forRoot(), LocksModule.forRoot()],
  providers: [Jobs, { provide: Redis, useValue: new Redis(redisUrl) }, RedisLockStore],
})
class FailoverModule {}

void NestFactory.createApplicationContext(FailoverModule, { logger: false });
