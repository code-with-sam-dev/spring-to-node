import 'reflect-metadata';
import { AppController } from '../app.controller.js';

// EPISODE 17 PROBE: does the test transform emit the constructor metadata Nest's DI reads?
describe('probe: decorator metadata under vitest', () => {
  it('reports what design:paramtypes holds for AppController', () => {
    const types = Reflect.getMetadata('design:paramtypes', AppController) as unknown[] | undefined;
    console.log(`  design:paramtypes on AppController: ${types ? types.map((t) => (t as { name?: string })?.name).join(', ') : 'undefined'}`);
    expect(true).toBe(true);
  });
});
