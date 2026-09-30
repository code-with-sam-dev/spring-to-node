import { startApp, urlOf } from './app.js';

/**
 * EPISODE 21, G: the edge of the window. Three a TWO SECOND window, so the probe runs in seconds:
 * three at once, one at 1 s, then one at 2.2 s and one at 3.2 s. Retry-After recorded on each 429.
 */
const at = (ms: number, t0: number) => new Promise((r) => setTimeout(r, Math.max(0, t0 + ms - Date.now())));

describe('G: the window edge', () => {
  it('two second window', async () => {
    const app = await startApp({ ttl: 2000 });
    const t0 = Date.now();
    const log: string[] = [];
    for (const ms of [0, 0, 0, 1000, 2200, 3200]) {
      await at(ms, t0);
      const res = await fetch(`${urlOf(app)}/payments`);
      log.push(`${(ms / 1000).toFixed(1)}s ${res.status}${res.status === 429 ? ` retry-after ${res.headers.get('retry-after')}` : ''}`);
    }
    console.log(`  Nest, G, three per 2 s: ${log.join(', ')}`);
    await app.close();
  });
});
