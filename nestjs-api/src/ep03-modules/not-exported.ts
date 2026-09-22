import 'reflect-metadata';
import { Injectable, Module, Inject } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * A provider that is decorated, tokenised and wired, and still refused.
 *
 * THIS IS THE EPISODE'S HOOK, so the error message it prints is load bearing.
 * Episode 2 taught a Spring developer that an interface cannot be injected by
 * type and that a token fixes it. This file does everything that episode said,
 * correctly, and the container still will not build, because NestJS has no
 * ambient container: a provider belongs to exactly ONE module and is invisible
 * outside it unless that module exports it and the consumer imports it.
 *
 * `abortOnError: false` is what makes the failure CATCHABLE. Without it Nest
 * handles the failure itself and exits the process, so a try/catch around the
 * call never runs and the script prints nothing at all. That cost an hour on
 * ep01-di/by-type.ts and it is written down here so it costs nobody else one.
 */
export const CLOCK = Symbol('Clock');

@Injectable()
class SystemClock {
  now() {
    return '2026-09-22T00:00:00.000Z';
  }
}

/*
  The provider is declared here and NOT exported. That single omission is the
  whole bug, and it is invisible: this module is completely valid on its own.
*/
@Module({
  providers: [{ provide: CLOCK, useClass: SystemClock }],
})
class ClockModule {}

@Injectable()
class ReceiptsService {
  constructor(@Inject(CLOCK) private readonly clock: SystemClock) {}
  stamp() {
    return `receipt at ${this.clock.now()}`;
  }
}

/*
  And the consumer imports the module, which a Spring developer reads as "the
  beans in there are now available". It is not what import means here. Import
  gives you what a module EXPORTS, and this one exports nothing.
*/
@Module({
  imports: [ClockModule],
  providers: [ReceiptsService],
})
class AppModule {}

let message = '';
try {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  await app.close();
} catch (err) {
  message = String((err as Error).message);
}

if (!message) {
  throw new Error('CLAIM FAILED: Nest built a container it should not have');
}

console.log(message.split('\n').slice(0, 4).join('\n'));

// The claim the episode makes is that the refusal names the CONSUMER and the
// unresolved position, exactly like the missing-token case in episode 2. If
// that stops being true the hook stops working, so it is asserted rather than
// remembered.
if (!message.includes('ReceiptsService')) {
  throw new Error(`CLAIM FAILED: the refusal does not name the consumer:\n${message}`);
}
console.log('\nasserted: a provider that is not exported cannot be injected');
