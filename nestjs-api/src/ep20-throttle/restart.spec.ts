import Redis from 'ioredis';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { startApp, urlOf } from './app';
import { RedisThrottlerStorage } from './redis-storage';

/** EPISODE 21, F: use the three, restart the instance, ask again. In memory, then in Redis. */
describe('F: a restart', () => {
  let redis: StartedTestContainer;
  beforeAll(async () => {
    redis = await new GenericContainer('redis:8-alpine').withExposedPorts(6379).start();
  }, 120000);
  afterAll(async () => redis?.stop());

  for (const label of ['in-memory storage', 'Redis storage']) {
    it(label, async () => {
      const url = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
      const clients: Redis[] = [];
      const make = () => {
        if (label === 'in-memory storage') return startApp();
        const c = new Redis(url);
        clients.push(c);
        return startApp({ storage: new RedisThrottlerStorage(c) });
      };
      let app = await make();
      const before: number[] = [];
      for (let i = 0; i < 4; i++) before.push((await fetch(`${urlOf(app)}/payments`)).status);
      await app.close();
      app = await make();
      const after = (await fetch(`${urlOf(app)}/payments`)).status;
      console.log(`  Nest, F, ${label}, before the restart: ${before.join(' ')}; first request after: ${after}`);
      await app.close();
      for (const c of clients) c.disconnect();
    });
  }
});
