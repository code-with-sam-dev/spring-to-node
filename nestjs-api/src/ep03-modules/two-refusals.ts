import 'reflect-metadata';
import { Injectable, Module, Inject } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * The two refusals, side by side, and the words that tell them apart.
 *
 * WHY THIS FILE EXISTS. The plan for this episode assumed the two errors were
 * "almost the same", and that the hook worked BECAUSE a viewer cannot tell them
 * apart. Measuring both showed something better: they differ in exactly two
 * places, and both differences are diagnostic.
 *
 *   erased interface, no token    ... the argument at index [0] is available
 *                                     in the current module.
 *   token present, not exported   ... the argument Symbol(Clock) at index [0]
 *                                     is available in the AppModule module.
 *
 * The TOKEN IS NAMED when one exists, and the MODULE IS NAMED when Nest knows
 * which one was asked. So the reading is:
 *
 *   no token in the message  -> the type erased. You need a token.  (episode 2)
 *   a token in the message   -> it exists, and it is not exported.  (this one)
 *
 * That is a rule a viewer can use on their own stack trace at work, which is
 * worth more than "the errors look similar". Asserted here so that if a future
 * NestJS changes either message, this fails rather than the video being wrong.
 */
interface Clock {
  now(): string;
}
const CLOCK = Symbol('Clock');

const refusalOf = async (mod: any): Promise<string> => {
  try {
    const app = await NestFactory.createApplicationContext(mod, {
      logger: false,
      abortOnError: false,
    });
    await app.close();
  } catch (err) {
    return String((err as Error).message).split('\n')[0];
  }
  throw new Error('CLAIM FAILED: the container built when it should not have');
};

// CASE ONE: no token at all. The parameter is an interface, the interface is
// erased, and the decorator records Object. Nothing names what was wanted.
@Injectable()
class ErasedConsumer {
  constructor(private readonly clock: Clock) {}
}
@Module({ providers: [ErasedConsumer] })
class ErasedModule {}

// CASE TWO: the token exists and is correct. It simply lives in a module that
// does not export it.
@Injectable()
class SystemClock implements Clock {
  now() {
    return 'now';
  }
}
@Module({ providers: [{ provide: CLOCK, useClass: SystemClock }] })
class ClockModule {}

@Injectable()
class TokenConsumer {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}
}
@Module({ imports: [ClockModule], providers: [TokenConsumer] })
class NotExportedModule {}

const erased = await refusalOf(ErasedModule);
const notExported = await refusalOf(NotExportedModule);

console.log('ERASED TYPE, no token declared:');
console.log(`  ${erased}\n`);
console.log('TOKEN DECLARED, module does not export it:');
console.log(`  ${notExported}\n`);

if (erased.includes('Symbol(')) {
  throw new Error(`CLAIM FAILED: the erased case named a token:\n${erased}`);
}
if (!notExported.includes('Symbol(Clock)')) {
  throw new Error(`CLAIM FAILED: the export case did not name the token:\n${notExported}`);
}
console.log('THE DIAGNOSTIC, asserted on both messages:');
console.log('  no token named  -> the type was erased. Declare a token.');
console.log('  a token named   -> it exists. The owning module is not exporting it.');
