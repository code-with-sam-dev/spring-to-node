import { vi } from 'vitest';

// EPISODE 17 PROBE, B: a stub that is never used. Mockito's strict stubs fail the test. Vitest?
describe('probe: an unused stub', () => {
  it('stubs a balance and never reads it', () => {
    const balance = vi.fn().mockReturnValue(100);
    console.log(`  unused stub: test passes, calls: ${balance.mock.calls.length}`);
  });
});
