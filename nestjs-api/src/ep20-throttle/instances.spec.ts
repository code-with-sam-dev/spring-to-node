import Redis from 'ioredis';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { startApp, urlOf } from './app';
import { RedisThrottlerStorage } from './redis-storage';

/**
 * EPISODE 21, C: two instances of the same app behind round robin, six requests from one client.
 * First with the default in-memory storage, then with one Redis both instances share.
 */
const roundRobin = async (apps: NestExpressApplication[], n: number) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((await fetch(`${urlOf(apps[i % apps.length])}/payments`)).status);
  return out;
};

describe('C: two instances', () => {
  let redis: StartedTestContainer;
  beforeAll(async () => {
    redis = await new GenericContainer('redis:8-alpine').withExposedPorts(6379).start();
  }, 120000);
  afterAll(async () => redis?.stop());

  it('in memory', async () => {
    const apps = [await startApp(), await startApp()];
    const s = await roundRobin(apps, 6);
    console.log(`  Nest, C, two instances, in-memory storage, six requests: ${s.join(' ')} (${s.filter((x) => x === 200).length} allowed)`);
    for (const a of apps) await a.close();
  });

  it('shared Redis', async () => {
    const url = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
    const clients = [new Redis(url), new Redis(url)];
    const apps = [await startApp({ storage: new RedisThrottlerStorage(clients[0]) }), await startApp({ storage: new RedisThrottlerStorage(clients[1]) })];
    const s = await roundRobin(apps, 6);
    console.log(`  Nest, C, two instances, one Redis, six requests: ${s.join(' ')} (${s.filter((x) => x === 200).length} allowed)`);
    for (const a of apps) await a.close();
    for (const c of clients) c.disconnect();
  });
});
