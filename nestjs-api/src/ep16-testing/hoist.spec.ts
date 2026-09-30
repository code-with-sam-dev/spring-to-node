import { vi } from 'vitest';
import { AppService } from '../app.service.js';

/**
 * EPISODE 17 PROBE: vi.mock is hoisted above the imports, so a variable declared in the test
 * file is not yet initialised when the factory runs. Mockito has no equivalent trap.
 */
const greeting = 'mocked';
vi.mock('../app.service.js', () => {
  const reply = greeting;
  return { AppService: class { getHello() { return reply; } } };
});

describe('probe: a vi.mock factory that reads a test-file variable', () => {
  it('constructs the mocked service', () => {
    try {
      console.log(`  getHello(): ${new AppService().getHello()}`);
    } catch (e) {
      console.log(`  failed: ${(e as Error).name}: ${(e as Error).message}`);
    }
  });
});
