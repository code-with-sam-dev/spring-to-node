import { HttpClient, HttpClientModule } from '@nestjs/http-client';
import { Test } from '@nestjs/testing';
import { closedPort, startDownstream } from './downstream';

/**
 * EPISODE 22 PROBES, @nestjs/http-client: the fetch-based client the Nest docs now describe, with
 * its defaults, against the same downstream server.
 */
const clientWith = async (options: Record<string, unknown> = {}) => {
  const moduleRef = await Test.createTestingModule({ imports: [HttpClientModule.register(options)] }).compile();
  return moduleRef.get(HttpClient);
};
const seconds = (since: number) => ((Date.now() - since) / 1000).toFixed(1);
const describeError = (e: unknown) => {
  const err = e as { name: string; status?: number };
  return `${err.name}${err.status ? `, status ${err.status}` : ''}`;
};

describe('@nestjs/http-client', () => {
  let downstream: Awaited<ReturnType<typeof startDownstream>>;
  beforeAll(async () => (downstream = await startDownstream()));
  afterAll(async () => downstream.close());

  it('A: the default timeout', async () => {
    const http = await clientWith();
    const started = Date.now();
    const res = await http.get(`${downstream.url}/slow`);
    console.log(`  Nest http-client, A, default, /slow: ${res.status} after ${seconds(started)} s, hits ${downstream.hits('/slow')}`);
  }, 60000);

  it('A: a one second timeout', async () => {
    const http = await clientWith({ timeout: '1s' });
    const before = downstream.hits('/slow');
    const started = Date.now();
    try {
      await http.get(`${downstream.url}/slow`);
    } catch (e) {
      console.log(`  Nest http-client, A, timeout '1s', GET /slow: ${describeError(e)} after ${seconds(started)} s, hits ${downstream.hits('/slow') - before}`);
    }
  }, 60000);

  it('B: a call nobody awaited', async () => {
    const http = await clientWith();
    const before = downstream.requests();
    void http.get(`${downstream.url}/payments/pay_1`);
    await new Promise((r) => setTimeout(r, 500));
    console.log(`  Nest http-client, B, http.get() without await, requests received: ${downstream.requests() - before}`);
  });

  it('C: a 500, a flaky route, a POST, a PUT, a closed port', async () => {
    const http = await clientWith();
    let started = Date.now();
    try {
      await http.get(`${downstream.url}/fail`);
    } catch (e) {
      console.log(`  Nest http-client, C, GET /fail: ${describeError(e)}, hits ${downstream.hits('/fail')}, after ${seconds(started)} s`);
    }
    started = Date.now();
    const flaky = await http.get(`${downstream.url}/flaky/http-client`);
    console.log(`  Nest http-client, C, GET /flaky, first answer 500: resolved ${flaky.status}, hits ${downstream.hits('/flaky/http-client')}, after ${seconds(started)} s`);
    const beforePost = downstream.hits('/fail');
    try {
      await http.post(`${downstream.url}/fail`, { amount: 100 });
    } catch (e) {
      console.log(`  Nest http-client, C, POST /fail: ${describeError(e)}, hits ${downstream.hits('/fail') - beforePost}`);
    }
    const beforePut = downstream.hits('/fail');
    try {
      await http.put(`${downstream.url}/fail`, { amount: 100 });
    } catch (e) {
      console.log(`  Nest http-client, C, PUT /fail: ${describeError(e)}, hits ${downstream.hits('/fail') - beforePut}`);
    }
    try {
      await http.get(`${await closedPort()}/payments`);
    } catch (e) {
      console.log(`  Nest http-client, C, closed port: ${describeError(e)}`);
    }
  }, 60000);
});
