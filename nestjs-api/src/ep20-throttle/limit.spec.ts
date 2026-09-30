import { NestExpressApplication } from '@nestjs/platform-express';
import { startApp, urlOf } from './app.js';

/** EPISODE 21, A: five requests against a limit of three a minute, and what the refusal carries. */
describe('A: the limit', () => {
  let app: NestExpressApplication;
  beforeAll(async () => (app = await startApp()));
  afterAll(async () => app.close());

  it('refuses the fourth request', async () => {
    const statuses: number[] = [];
    let refused: Response | undefined;
    let first: Response | undefined;
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${urlOf(app)}/payments`);
      statuses.push(res.status);
      if (!first) first = res;
      if (res.status === 429 && !refused) refused = res;
    }
    console.log(`  Nest, A, five requests, limit 3: ${statuses.join(' ')}`);
    for (const h of ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
      console.log(`  Nest, A, on the first 200, ${h}: ${first?.headers.get(h)}`);
    }
    for (const h of ['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
      console.log(`  Nest, A, on the 429, ${h}: ${refused?.headers.get(h)}`);
    }
    const health: number[] = [];
    for (let i = 0; i < 5; i++) health.push((await fetch(`${urlOf(app)}/health`)).status);
    console.log(`  Nest, D, @SkipThrottle() health, five requests: ${health.join(' ')}`);
    const login: number[] = [];
    for (let i = 0; i < 3; i++) login.push((await fetch(`${urlOf(app)}/login`, { method: 'POST' })).status);
    console.log(`  Nest, D, @Throttle limit 1 on login, three requests: ${login.join(' ')}`);
  });
});
