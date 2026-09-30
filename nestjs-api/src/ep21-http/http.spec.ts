import { HttpModule, HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { closedPort, startDownstream } from './downstream.js';

/**
 * EPISODE 22 PROBES, @nestjs/axios: HttpService against a real downstream server, and Node's
 * built-in fetch for comparison.
 */
const serviceWith = async (options: Record<string, unknown> = {}) => {
  const moduleRef = await Test.createTestingModule({ imports: [HttpModule.register(options)] }).compile();
  return moduleRef.get(HttpService);
};
const seconds = (since: number) => ((Date.now() - since) / 1000).toFixed(1);
const describeError = (e: unknown) => {
  const err = e as { name: string; code?: string; response?: { status: number } };
  return `${err.name}${err.code ? ` ${err.code}` : ''}${err.response ? `, status ${err.response.status}` : ''}`;
};

describe('@nestjs/axios', () => {
  let downstream: Awaited<ReturnType<typeof startDownstream>>;
  beforeAll(async () => (downstream = await startDownstream()));
  afterAll(async () => downstream.close());

  it('A: the default timeout', async () => {
    const http = await serviceWith();
    const started = Date.now();
    const res = await firstValueFrom(http.get(`${downstream.url}/slow`));
    console.log(`  Nest axios, A, default, /slow: ${res.status} after ${seconds(started)} s`);
  }, 30000);

  it('A: a one second timeout, and what the downstream did', async () => {
    const http = await serviceWith({ timeout: 1000 });
    const started = Date.now();
    downstream.events.length = 0;
    try {
      await firstValueFrom(http.get(`${downstream.url}/slow`));
    } catch (e) {
      console.log(`  Nest axios, A, timeout 1000, /slow: ${describeError(e)} after ${seconds(started)} s`);
    }
    await new Promise((r) => setTimeout(r, 10500));
    console.log(`  Nest axios, A, the downstream: ${downstream.events.join('; ')}`);
  }, 30000);

  it('B: the request nobody subscribed to', async () => {
    const http = await serviceWith();
    const before = downstream.requests();
    http.get(`${downstream.url}/payments/pay_1`);
    await new Promise((r) => setTimeout(r, 500));
    console.log(`  Nest axios, B, http.get() without firstValueFrom, requests received: ${downstream.requests() - before}`);
    await firstValueFrom(http.get(`${downstream.url}/payments/pay_1`));
    console.log(`  Nest axios, B, with firstValueFrom, requests received: ${downstream.requests() - before}`);
  });

  it('C: a 500, a flaky route, a closed port', async () => {
    const http = await serviceWith();
    try {
      await firstValueFrom(http.get(`${downstream.url}/fail`));
    } catch (e) {
      console.log(`  Nest axios, C, GET /fail: ${describeError(e)}, hits ${downstream.hits('/fail')}`);
    }
    try {
      await firstValueFrom(http.get(`${downstream.url}/flaky/axios`));
    } catch (e) {
      console.log(`  Nest axios, C, GET /flaky, first answer 500: ${describeError(e)}, hits ${downstream.hits('/flaky/axios')}`);
    }
    try {
      await firstValueFrom(http.get(`${await closedPort()}/payments`));
    } catch (e) {
      console.log(`  Nest axios, C, closed port: ${describeError(e)}`);
    }
    const res = await fetch(`${downstream.url}/fail`);
    console.log(`  Node fetch, C, GET /fail: resolved, ok ${res.ok}, status ${res.status}`);
  });
});
