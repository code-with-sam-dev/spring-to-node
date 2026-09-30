import { vi } from 'vitest';

/**
 * EPISODE 17 PROBE, F: what each reset setting does to a stub defined once at describe scope,
 * and to a spy on a real method. Run under each config in verify-testing.sh.
 */
const balance = vi.fn().mockReturnValue(100);
const clock = { now: () => 'real' };
const spy = vi.spyOn(clock, 'now').mockReturnValue('stubbed');

describe('probe: reset modes', () => {
  it('first test', () => {
    balance();
    console.log(`  first test:  balance() = ${balance()}, calls ${balance.mock.calls.length}, clock.now() = ${clock.now()}`);
  });
  it('second test', () => {
    console.log(`  second test: balance() = ${balance()}, calls ${balance.mock.calls.length}, clock.now() = ${clock.now()}, spy calls ${spy.mock.calls.length}`);
  });
});
