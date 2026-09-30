import { HttpClient, HttpClientModule } from '@nestjs/http-client';
import { Test } from '@nestjs/testing';
import { startDownstream } from './downstream';

/** EPISODE 23 PROBES, Nest: @nestjs/http-client's default retries, twenty callers, and a POST. */
const clientWith = async (options: Record<string, unknown> = {}) => {
  const moduleRef = await Test.createTestingModule({ imports: [HttpClientModule.register(options)] }).compile();
  return moduleRef.get(HttpClient);
};
const outcome = async (call: () => Promise<unknown>) => {
  try {
    await call();
    return 'resolved';
  } catch (e) {
    return `rejected with ${(e as Error).name}`;
  }
};

describe('retries', () => {
  let downstream: Awaited<ReturnType<typeof startDownstream>>;
  beforeAll(async () => (downstream = await startDownstream()));
  afterAll(async () => downstream.close());

  it('C: the default backoff', async () => {
    const http = await clientWith();
    const o = await outcome(() => http.get(`${downstream.url}/defaults`));
    console.log(`  Nest, C, @nestjs/http-client defaults, GET while down: ${o}, hits ${downstream.hits('/defaults')} at ${downstream.timeline('/defaults')}`);
  });

  it('D: a POST', async () => {
    const http = await clientWith();
    const o = await outcome(() => http.post(`${downstream.url}/charge`, { amount: 100 }));
    console.log(`  Nest, D, @nestjs/http-client defaults, POST while down: ${o}, hits ${downstream.hits('/charge')}`);
  });

  it('A: twenty callers', async () => {
    const http = await clientWith();
    const started = performance.now();
    await Promise.all(Array.from({ length: 20 }, () => outcome(() => http.get(`${downstream.url}/status`))));
    console.log(`  Nest, A, 20 callers, @nestjs/http-client defaults, while down: hits ${downstream.hits('/status')} in ${((performance.now() - started) / 1000).toFixed(1)} s`);
    const once = await clientWith({ retry: false });
    await Promise.all(Array.from({ length: 20 }, () => outcome(() => once.get(`${downstream.url}/once`))));
    console.log(`  Nest, A, 20 callers, retry: false, while down: hits ${downstream.hits('/once')}`);
  });
});
