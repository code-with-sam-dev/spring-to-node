import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppController } from '../app.controller.js';
import { AppService } from '../app.service.js';

// EPISODE 17 PROBE, C: the @MockitoBean equivalent. Replace one provider in the testing module.
describe('probe: overrideProvider', () => {
  it('swaps AppService for a stub', async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [AppController], providers: [AppService] })
      .overrideProvider(AppService)
      .useValue({ getHello: vi.fn().mockReturnValue('stubbed') })
      .compile();
    console.log(`  controller.getHello() with the override: ${moduleRef.get(AppController).getHello()}`);
  });
});
