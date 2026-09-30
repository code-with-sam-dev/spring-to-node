import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { performance } from 'node:perf_hooks';

/**
 * EPISODE 18 PROBE, E: what building the testing module per test costs. The scaffold's e2e spec
 * builds it in beforeEach; Spring caches one ApplicationContext and reuses it.
 */
const imports = () => [
  TypeOrmModule.forRoot({
    type: 'postgres', host: 'localhost', port: 5434, username: 'payments', password: 'payments',
    database: 'payments_node', entities: [],
  }),
];
const tests = 5;

describe('E: five tests, a module built in beforeEach', () => {
  let moduleRef: TestingModule;
  let spent = 0;
  beforeEach(async () => {
    const t = performance.now();
    moduleRef = await Test.createTestingModule({ imports: imports() }).compile();
    spent += performance.now() - t;
  });
  afterEach(async () => moduleRef.close());
  for (let i = 1; i <= tests; i++) it(`test ${i}`, () => expect(moduleRef).toBeDefined());
  afterAll(() => console.log(`  Nest, E, beforeEach: ${tests} module builds, ${Math.round(spent)} ms`));
});

describe('E: five tests, one module built in beforeAll', () => {
  let moduleRef: TestingModule;
  let spent = 0;
  beforeAll(async () => {
    const t = performance.now();
    moduleRef = await Test.createTestingModule({ imports: imports() }).compile();
    spent += performance.now() - t;
  });
  afterAll(async () => {
    await moduleRef.close();
    console.log(`  Nest, E, beforeAll: 1 module build, ${Math.round(spent)} ms`);
  });
  for (let i = 1; i <= tests; i++) it(`test ${i}`, () => expect(moduleRef).toBeDefined());
});
