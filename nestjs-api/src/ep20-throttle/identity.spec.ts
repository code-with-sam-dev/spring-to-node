import { startApp, urlOf } from './app.js';

/**
 * EPISODE 21, E: two signed-in users behind one address. Keyed by address, then by user.
 * The x-user header stands in for a verified identity.
 */
describe('E: which identity', () => {
  for (const [label, byUser] of [['keyed by address', false], ['keyed by user', true]] as const) {
    it(label, async () => {
      const app = await startApp({ byUser });
      const a: number[] = [];
      for (let i = 0; i < 3; i++) a.push((await fetch(`${urlOf(app)}/payments`, { headers: { 'x-user': 'alice' } })).status);
      const b = (await fetch(`${urlOf(app)}/payments`, { headers: { 'x-user': 'bob' } })).status;
      console.log(`  Nest, E, ${label}, alice x3: ${a.join(' ')}; bob, first request: ${b}`);
      await app.close();
    });
  }
});
