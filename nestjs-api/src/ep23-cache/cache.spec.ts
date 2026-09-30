import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { startApp } from './app';

/** EPISODE 24 PROBES, Nest: @nestjs/cache-manager's CacheInterceptor, in memory and in Redis. */
const json = async (res: Response) => JSON.stringify(await res.json());

describe('@nestjs/cache-manager', () => {
  let redis: StartedTestContainer;
  beforeAll(async () => {
    redis = await new GenericContainer('redis:8-alpine').withExposedPorts(6379).start();
  }, 120000);
  afterAll(async () => redis?.stop());

  for (const store of ['in memory', 'Redis']) {
    const opts = () => (store === 'Redis' ? { redisUrl: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}` } : {});

    it(`A: whose data, ${store}`, async () => {
      const { app, url } = await startApp(opts());
      const alice = await json(await fetch(`${url}/me`, { headers: { 'x-user': 'alice' } }));
      const bob = await json(await fetch(`${url}/me`, { headers: { 'x-user': 'bob' } }));
      console.log(`  Nest, A, ${store}, GET /me as alice: ${alice}; then as bob: ${bob}`);
      const alice2 = await json(await fetch(`${url}/me-per-user`, { headers: { 'x-user': 'alice' } }));
      const bob2 = await json(await fetch(`${url}/me-per-user`, { headers: { 'x-user': 'bob' } }));
      console.log(`  Nest, A, ${store}, trackBy with the user in the key, as alice: ${alice2}; then as bob: ${bob2}`);
      await app.close();
    });

    it(`B: stale after a write, ${store}`, async () => {
      const { app, url } = await startApp(opts());
      await fetch(`${url}/payments/pay_1`);
      await fetch(`${url}/payments/pay_1`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"status":"settled"}' });
      const stale = await json(await fetch(`${url}/payments/pay_1`));
      await fetch(`${url}/payments/pay_1/evicting`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"status":"refunded"}' });
      const fresh = await json(await fetch(`${url}/payments/pay_1`));
      console.log(`  Nest, B, ${store}, after PUT settled, GET: ${stale}; after PUT refunded with cache.del: ${fresh}`);
      await app.close();
    });

    it(`C: twenty at once on a cold key, ${store}`, async () => {
      const { app, url, loads } = await startApp(opts());
      const cold = `pay_cold_${store === 'Redis' ? 'redis' : 'memory'}`;
      await Promise.all(Array.from({ length: 20 }, () => fetch(`${url}/payments/${cold}`)));
      console.log(`  Nest, C, ${store}, 20 concurrent GETs on a cold key: repository loads ${loads.count}`);
      await fetch(`${url}/payments/${cold}`);
      console.log(`  Nest, C, ${store}, one more GET: repository loads ${loads.count}`);
      const before = loads.count;
      await Promise.all(Array.from({ length: 20 }, () => fetch(`${url}/payments-once/${cold}_once`)));
      console.log(`  Nest, C, ${store}, 20 concurrent GETs, cache-aside sharing the in-flight load: repository loads ${loads.count - before}`);
      await app.close();
    });
  }
});
