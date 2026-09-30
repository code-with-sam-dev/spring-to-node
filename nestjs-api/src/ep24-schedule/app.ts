import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LocksModule, OnOneInstance, WithoutOverlapping } from '@nestjs/locks';
import { Cron, Interval, ScheduleModule } from '@nestjs/schedule';
import { Redis } from 'ioredis';
import { RedisLockStore } from './redis-lock-store.js';

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

    @Cron('* * * * * *')
    async report() {
      await this.run('report');
    }

    @Cron('* * * * * *', { waitForCompletion: true })
    async reportWaiting() {
      await this.run('reportWaiting');
    }

    @Cron('* * * * * *')
    @WithoutOverlapping({ key: 'payments:report' })
    async reportAlone() {
      await this.run('reportAlone');
    }

    private async run(job: string) {
      if (!on(job)) return;
      record(job, 'start');
      await new Promise((r) => setTimeout(r, 2500));
      record(job, 'end');
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
