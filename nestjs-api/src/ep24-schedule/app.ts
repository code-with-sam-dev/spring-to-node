import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LocksModule, OnOneInstance, WithoutOverlapping } from '@nestjs/locks';
import { Cron, Interval, ScheduleModule } from '@nestjs/schedule';
import Redis from 'ioredis';
import { RedisLockStore } from './redis-lock-store';

/**
 * EPISODE 25. One application instance with the scheduled jobs a probe asks for, and a shared log
 * of every run. `name` tells the instances apart; `store` picks where locks live.
 */
export type Run = { job: string; instance: string; at: number; event: 'start' | 'end' | 'error' };

const busy = (ms: number) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    // a job that holds the thread, like parsing a large file
  }
};

export async function startApp(opts: { name: string; jobs: string[]; log: Run[]; redisUrl?: string }) {
  const record = (job: string, event: Run['event']) => opts.log.push({ job, instance: opts.name, at: Date.now(), event });
  const on = (job: string) => opts.jobs.includes(job);

  @Injectable()
  class Jobs {
    @Cron('* * * * * *')
    settle() {
      if (on('settle')) record('settle', 'start');
    }

    @Cron('* * * * * *')
    @OnOneInstance({ key: 'payments:settle' })
    settleOnce() {
      if (on('settleOnce')) record('settleOnce', 'start');
    }

    @Interval(500)
    async report() {
      if (!on('report')) return;
      record('report', 'start');
      await new Promise((r) => setTimeout(r, 1500));
      record('report', 'end');
    }

    @Interval(500)
    @WithoutOverlapping({ key: 'payments:report' })
    async reportAlone() {
      if (!on('reportAlone')) return;
      record('reportAlone', 'start');
      await new Promise((r) => setTimeout(r, 1500));
      record('reportAlone', 'end');
    }

    @Interval(200)
    heartbeat() {
      if (on('heartbeat')) record('heartbeat', 'start');
    }

    @Interval(1000)
    async slowAsync() {
      if (on('slowAsync')) await new Promise((r) => setTimeout(r, 800));
    }

    @Interval(1000)
    slowBusy() {
      if (on('slowBusy')) busy(800);
    }

    @Interval(300)
    failing() {
      if (!on('failing')) return;
      record('failing', 'start');
      throw new Error('payments API down');
    }
  }

  const redis = opts.redisUrl ? new Redis(opts.redisUrl) : undefined;

  @Module({
    imports: [ScheduleModule.forRoot(), LocksModule.forRoot()],
    providers: [Jobs, ...(redis ? [{ provide: Redis, useValue: redis }, RedisLockStore] : [])],
  })
  class JobsModule {}

  const app = await NestFactory.createApplicationContext(JobsModule, { logger: false });
  return {
    close: async () => {
      await app.close();
      redis?.disconnect();
    },
  };
}
