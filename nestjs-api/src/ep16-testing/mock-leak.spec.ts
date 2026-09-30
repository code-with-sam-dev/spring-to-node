import { vi } from 'vitest';

/**
 * EPISODE 17 PROBE: a vi.fn() shared by a describe block, the way a Mockito @Mock field is.
 * With MockitoExtension each test gets a fresh mock. Does Vitest reset call counts by default?
 */
const charge = vi.fn();

describe('probe: a shared mock across two tests', () => {
  it('first test charges once', () => {
    charge(100);
    console.log(`  first test, calls so far: ${charge.mock.calls.length}`);
  });
  it('second test charges once', () => {
    charge(200);
    console.log(`  second test, calls so far: ${charge.mock.calls.length}`);
  });
});
