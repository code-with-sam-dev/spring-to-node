import 'reflect-metadata';
import { Injectable, Module, Inject } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * The same graph as not-exported.ts, with two words added.
 *
 * NOTHING ELSE CHANGES, and that is the point of having this as a separate
 * file rather than a diff in prose: the classes, the token, the decorators and
 * the injection are byte for byte the ones that were refused. Only the module
 * metadata moved.
 */
export const CLOCK = Symbol('Clock');

@Injectable()
class SystemClock {
  now() {
    return '2026-09-22T00:00:00.000Z';
  }
}

@Module({
  providers: [{ provide: CLOCK, useClass: SystemClock }],
  // THE FIRST OF THE TWO WORDS. A module's providers are private by default,
  // which is the opposite of Spring, where a scanned @Component is reachable
  // from anywhere in the context.
  exports: [CLOCK],
})
class ClockModule {}

@Injectable()
class ReceiptsService {
  constructor(@Inject(CLOCK) private readonly clock: SystemClock) {}
  stamp() {
    return `receipt at ${this.clock.now()}`;
  }
}

@Module({
  // AND THE SECOND. The import was already here in the broken version, which
  // is why the bug is hard to see: the half a Spring developer thinks about is
  // present, and the half they have never needed is missing.
  imports: [ClockModule],
  providers: [ReceiptsService],
})
class AppModule {}

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
const receipts = app.get(ReceiptsService);
const stamped = receipts.stamp();
await app.close();

console.log(stamped);

if (stamped !== 'receipt at 2026-09-22T00:00:00.000Z') {
  throw new Error(`CLAIM FAILED: got ${stamped}`);
}
console.log('asserted: exports plus imports, and the same graph resolves');
