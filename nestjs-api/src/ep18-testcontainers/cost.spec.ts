import 'reflect-metadata';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { performance } from 'node:perf_hooks';

/**
 * EPISODE 19 PROBE, B: what a container costs when it is started per test file, three files'
 * worth, against once for the whole run. Reported as wall time for three starts and stops.
 */
describe('B: three container starts, the way three files would each start one', () => {
  it('starts and stops three containers', async () => {
    const t = performance.now();
    for (let i = 0; i < 3; i++) {
      const c: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:18-alpine').start();
      await c.stop();
    }
    console.log(`  Nest, B, three container starts and stops: ${Math.round(performance.now() - t)} ms`);
  }, 180_000);
});
