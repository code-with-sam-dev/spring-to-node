import { HttpClient, HttpClientModule } from '@nestjs/http-client';
import { Test } from '@nestjs/testing';
import CircuitBreaker from 'opossum';
import { startDownstream } from './downstream.js';

/**
 * EPISODE 23 PROBE, Nest: twenty calls in a row through an opossum circuit breaker while the
 * payments API is down, then one call after the wait once it is back.
 */
describe('circuit breaker', () => {
  it('opossum', async () => {
    const downstream = await startDownstream();
    const moduleRef = await Test.createTestingModule({ imports: [HttpClientModule.register({ retry: false })] }).compile();
    const http = moduleRef.get(HttpClient);

    const breaker = new CircuitBreaker(() => http.get(`${downstream.url}/status`), {
      volumeThreshold: 5,
      errorThresholdPercentage: 50,
      resetTimeout: 1000,
    });
    const transitions: string[] = [];
    breaker.on('open', () => transitions.push('open'));
    breaker.on('halfOpen', () => transitions.push('halfOpen'));
    breaker.on('close', () => transitions.push('close'));

    let rejected = 0;
    let rejectedMs = 0;
    for (let i = 0; i < 20; i++) {
      const t = performance.now();
      try {
        await breaker.fire();
      } catch (e) {
        if ((e as { code?: string }).code === 'EOPENBREAKER') {
          rejected++;
          rejectedMs += performance.now() - t;
        }
      }
    }
    console.log(`  Nest, B, opossum, 20 calls while down: hits ${downstream.hits('/status')}, rejected without a call ${rejected}, ${(rejectedMs / Math.max(rejected, 1)).toFixed(2)} ms each`);
    downstream.state.down = false;
    await new Promise((r) => setTimeout(r, 1100));
    const after = (await breaker.fire()) as { data: unknown };
    console.log(`  Nest, B, opossum, back up, one call after the wait: ${JSON.stringify(after.data)}, closed ${breaker.closed}`);
    console.log(`  Nest, B, opossum, transitions: ${transitions.join(', ')}`);
    breaker.shutdown();
    await downstream.close();
  });
});
