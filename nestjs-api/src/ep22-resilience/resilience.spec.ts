import { startApp } from './app.js';
import { startDownstream } from './downstream.js';

/**
 * EPISODE 23 PROBES, @nestjs/resilience: a retry on the handler over the HTTP client's own retries,
 * POST handlers, a decorator on a service, and a circuit breaker with Resilience4j's settings.
 */
describe('@nestjs/resilience', () => {
  it('E: a retry on the handler, over the client retries, then without them', async () => {
    const downstream = await startDownstream();
    for (const clientRetry of [true, false]) {
      const { app, url } = await startApp({ downstream: downstream.url, clientRetry });
      const before = downstream.hits('/status');
      const res = await fetch(`${url}/payments/status`);
      console.log(`  Nest, E, @Retry({ attempts: 3 }) on the handler, HTTP client retry ${clientRetry ? 'default' : 'false'}: ${res.status}, hits ${downstream.hits('/status') - before}`);
      await app.close();
    }
    await downstream.close();
  }, 60000);

  it('D: POST handlers, and a decorator on a service', async () => {
    const downstream = await startDownstream();
    const { app, url, warnings } = await startApp({ downstream: downstream.url, clientRetry: false });
    await fetch(`${url}/payments/charge`, { method: 'POST' });
    console.log(`  Nest, D, @Retry({ attempts: 3 }) on a POST handler: hits ${downstream.hits('/charge')}`);
    await fetch(`${url}/payments/charge-idempotent`, { method: 'POST' });
    console.log(`  Nest, D, @Retry({ attempts: 3, idempotent: true }) on a POST handler: hits ${downstream.hits('/charge-idempotent')}`);
    await fetch(`${url}/payments/via-service`);
    console.log(`  Nest, D, @Retry({ attempts: 3 }) on a service method: hits ${downstream.hits('/service')}`);
    for (const w of warnings.filter((m) => m.includes('PaymentsService'))) console.log(`  Nest, D, boot warning: ${w}`);
    await app.close();
    await downstream.close();
  }, 60000);

  it('B: a circuit breaker', async () => {
    const downstream = await startDownstream();
    const { app, url } = await startApp({ downstream: downstream.url, clientRetry: false });
    const statuses = new Map<number, number>();
    let rejectedMs = 0;
    for (let i = 0; i < 20; i++) {
      const t = performance.now();
      const res = await fetch(`${url}/payments/breaker`);
      statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
      if (res.status === 503) rejectedMs += performance.now() - t;
    }
    const open = statuses.get(503) ?? 0;
    console.log(`  Nest, B, @CircuitBreaker, 20 calls while down: hits ${downstream.hits('/breaker')}, answered 503 without a call ${open}, ${(rejectedMs / Math.max(open, 1)).toFixed(2)} ms each`);
    const retryAfter = (await fetch(`${url}/payments/breaker`)).headers.get('retry-after');
    console.log(`  Nest, B, @CircuitBreaker, while open, retry-after: ${retryAfter}`);
    downstream.state.down = false;
    await new Promise((r) => setTimeout(r, 1100));
    const after = await fetch(`${url}/payments/breaker`);
    console.log(`  Nest, B, @CircuitBreaker, back up, one call after the wait: ${after.status} ${await after.text()}`);
    await app.close();
    await downstream.close();
  }, 60000);
});
