import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { startApp } from './app';

/**
 * EPISODE 24 PROBES, Nest: a cache entry's lifetime, a stampede when a hot key expires, two
 * replicas on one Redis, and a payment that does not exist.
 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('lifetime', () => {
  let redis: StartedTestContainer;
  let redisUrl: string;
  beforeAll(async () => {
    redis = await new GenericContainer('redis:8-alpine').withExposedPorts(6379).start();
    redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
  }, 120000);
  afterAll(async () => redis?.stop());

  it('D: no ttl, then a one second ttl', async () => {
    let s = await startApp({ redisUrl });
    await fetch(`${s.url}/payments/pay_forever`);
    await wait(1200);
    await fetch(`${s.url}/payments/pay_forever`);
    console.log(`  Nest, D, Redis, no ttl, GET, wait 1.2 s, GET: repository loads ${s.loads.count}`);
    await s.app.close();
    s = await startApp({ redisUrl, ttl: 1000 });
    await fetch(`${s.url}/payments/pay_ttl`);
    await fetch(`${s.url}/payments/pay_ttl`);
    await wait(1200);
    await fetch(`${s.url}/payments/pay_ttl`);
    console.log(`  Nest, D, Redis, ttl 1000, GET, GET, wait 1.2 s, GET: repository loads ${s.loads.count}`);
    await s.app.close();
  });

  it('E: a hot key expires', async () => {
    const s = await startApp({ redisUrl, ttl: 1000 });
    await fetch(`${s.url}/payments/pay_hot`);
    await fetch(`${s.url}/payments-once/pay_hot_once`);
    await wait(1200);
    let before = s.loads.count;
    await Promise.all(Array.from({ length: 20 }, () => fetch(`${s.url}/payments/pay_hot`)));
    const plain = s.loads.count - before;
    before = s.loads.count;
    await Promise.all(Array.from({ length: 20 }, () => fetch(`${s.url}/payments-once/pay_hot_once`)));
    console.log(`  Nest, E, hot key expired, 20 concurrent GETs: CacheInterceptor loads ${plain}, cache-aside sharing the in-flight load ${s.loads.count - before}`);
    await s.app.close();
  });

  it('F: two replicas on one Redis', async () => {
    const a = await startApp({ redisUrl });
    const b = await startApp({ redisUrl });
    await Promise.all([a, b].flatMap((s) => Array.from({ length: 10 }, () => fetch(`${s.url}/payments-once/pay_shared`))));
    console.log(`  Nest, F, two replicas on one Redis, 10 concurrent GETs each, cache-aside sharing the in-flight load: repository loads ${a.loads.count + b.loads.count}`);
    await a.app.close();
    await b.app.close();
  });

  it('G: a payment that does not exist', async () => {
    const s = await startApp({ redisUrl });
    for (let i = 0; i < 20; i++) await fetch(`${s.url}/payments/missing_1`);
    console.log(`  Nest, G, Redis, 20 GETs for a payment that does not exist: repository loads ${s.loads.count}`);
    await s.app.close();
  });
});
