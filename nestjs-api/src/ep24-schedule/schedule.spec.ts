import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Run, startApp } from './app.js';

/**
 * EPISODE 25 PROBES, Nest: @nestjs/schedule and @nestjs/locks. Two instances are two application
 * contexts, each with its own scheduler and its own lock store unless both use Redis.
 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const count = (log: Run[], job: string, instance?: string) => log.filter((r) => r.job === job && r.event === 'start' && (!instance || r.instance === instance)).length;
/** Distinct seconds the job ran in, and how many of those seconds it ran in more than once. */
const ticks = (log: Run[], job: string) => {
  const perSecond = new Map<number, number>();
  for (const r of log.filter((x) => x.job === job && x.event === 'start')) perSecond.set(Math.floor(r.at / 1000), (perSecond.get(Math.floor(r.at / 1000)) ?? 0) + 1);
  return `ticks ${perSecond.size}, ticks run twice ${[...perSecond.values()].filter((n) => n > 1).length}`;
};
const maxConcurrent = (log: Run[], job: string) => {
  let now = 0;
  let max = 0;
  for (const r of [...log].filter((x) => x.job === job).sort((a, b) => a.at - b.at)) {
    now += r.event === 'start' ? 1 : r.event === 'end' ? -1 : 0;
    max = Math.max(max, now);
  }
  return max;
};

describe('@nestjs/schedule', () => {
  let redis: StartedTestContainer;
  let redisUrl: string;
  beforeAll(async () => {
    redis = await new GenericContainer('redis:8-alpine').withExposedPorts(6379).start();
    redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
  }, 120000);
  afterAll(async () => redis?.stop());

  it('A: two instances, a job every second', async () => {
    const log: Run[] = [];
    const a = await startApp({ name: 'a', jobs: ['settle'], log });
    const b = await startApp({ name: 'b', jobs: ['settle'], log });
    await wait(3100);
    await a.close();
    await b.close();
    console.log(`  Nest, A, two instances, @Cron every second, 3 s: runs ${count(log, 'settle')} (instance a ${count(log, 'settle', 'a')}, instance b ${count(log, 'settle', 'b')}), ${ticks(log, 'settle')}`);
  });

  it('B: @OnOneInstance, default store, then Redis', async () => {
    for (const store of ['default in-memory store', 'Redis lock store']) {
      const log: Run[] = [];
      const url = store === 'Redis lock store' ? redisUrl : undefined;
      const a = await startApp({ name: 'a', jobs: ['settleOnce'], log, redisUrl: url });
      const b = await startApp({ name: 'b', jobs: ['settleOnce'], log, redisUrl: url });
      await wait(3100);
      await a.close();
      await b.close();
      console.log(`  Nest, B, two instances, @OnOneInstance, ${store}, 3 s: runs ${count(log, 'settleOnce')} (instance a ${count(log, 'settleOnce', 'a')}, instance b ${count(log, 'settleOnce', 'b')}), ${ticks(log, 'settleOnce')}`);
    }
  }, 30000);

  it('C: a 1.5 s job every 500 ms', async () => {
    for (const job of ['report', 'reportAlone']) {
      const log: Run[] = [];
      const a = await startApp({ name: 'a', jobs: [job], log });
      await wait(3000);
      await a.close();
      const label = job === 'report' ? '@Interval(500)' : '@Interval(500) with @WithoutOverlapping';
      console.log(`  Nest, C, ${label}, a job that takes 1.5 s, 3 s: runs started ${count(log, job)}, most at once ${maxConcurrent(log, job)}`);
    }
  }, 30000);

  it('D: a slow job beside a 200 ms heartbeat', async () => {
    for (const slow of ['slowAsync', 'slowBusy']) {
      const log: Run[] = [];
      const a = await startApp({ name: 'a', jobs: ['heartbeat', slow], log });
      await wait(3000);
      await a.close();
      const beats = log.filter((r) => r.job === 'heartbeat').map((r) => r.at);
      const gaps = beats.slice(1).map((t, i) => t - beats[i]);
      const label = slow === 'slowAsync' ? 'an 800 ms job that awaits' : 'an 800 ms job that holds the thread';
      console.log(`  Nest, D, beside ${label}: heartbeats in 3 s ${beats.length}, longest gap ${Math.max(...gaps)} ms`);
    }
  }, 30000);

  it('E: a job that throws', async () => {
    const log: Run[] = [];
    const a = await startApp({ name: 'a', jobs: ['failing'], log });
    await wait(1600);
    await a.close();
    console.log(`  Nest, E, @Interval(300) that throws every time, 1.6 s: runs ${count(log, 'failing')}`);
  });
});
