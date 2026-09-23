import 'reflect-metadata';
import { Injectable, Module, Scope } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * IS NEST'S TRANSIENT THE SAME THING AS SPRING'S PROTOTYPE?
 *
 * The consult proposed a Short titled "Nest TRANSIENT is not Spring prototype".
 * That needs an OBSERVABLE difference, so this counts instances in the three
 * shapes where the two could disagree, and Ep03PrototypeTest counts the same
 * three shapes on the Spring side.
 */
let created = 0;

@Injectable({ scope: Scope.TRANSIENT })
class Counter {
  readonly id = ++created;
}

@Injectable()
class ConsumerA {
  constructor(readonly c: Counter) {}
}

@Injectable()
class ConsumerB {
  constructor(readonly c: Counter) {}
}

/** One consumer asking for the SAME transient provider twice. */
@Injectable()
class TwiceInOne {
  constructor(readonly first: Counter, readonly second: Counter) {}
}

@Module({ providers: [Counter, ConsumerA, ConsumerB, TwiceInOne] })
class AppModule {}

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
const a = app.get(ConsumerA);
const b = app.get(ConsumerB);
const t = app.get(TwiceInOne);

let resolved1 = -1;
let resolved2 = -1;
try {
  resolved1 = (await app.resolve(Counter)).id;
  resolved2 = (await app.resolve(Counter)).id;
} catch (e) {
  console.log(`resolve() threw: ${(e as Error).message}`);
}
let getResult = 'not attempted';
try {
  getResult = `returned id ${app.get(Counter).id}`;
} catch (e) {
  getResult = `threw: ${(e as Error).message.slice(0, 120)}`;
}
await app.close();

console.log('NestJS, Scope.TRANSIENT:\n');
console.log(`  two different consumers         ids ${a.c.id} and ${b.c.id}   ${a.c.id !== b.c.id ? 'DIFFERENT' : 'SAME'}`);
console.log(`  one consumer, injected twice    ids ${t.first.id} and ${t.second.id}   ${t.first.id !== t.second.id ? 'DIFFERENT' : 'SAME'}`);
console.log(`  asked for directly, twice       ids ${resolved1} and ${resolved2}   ${resolved1 !== resolved2 ? 'DIFFERENT' : 'SAME'}`);
console.log(`  app.get(Counter)                ${getResult}`);
console.log(`\n  instances created in total: ${created}`);

// Asserted as OBSERVED. Ep03PrototypeTest measured Spring's prototype in the
// same three shapes: DIFFERENT, DIFFERENT, DIFFERENT. The middle row is where
// the two frameworks disagree, and it is the whole of Short 4.
if (a.c.id === b.c.id) throw new Error('CLAIM FAILED: two consumers shared a transient');
if (t.first.id !== t.second.id) {
  throw new Error('OBSERVATION CHANGED: one consumer now gets two transient instances');
}
if (resolved1 === resolved2) throw new Error('CLAIM FAILED: resolve() returned one instance twice');
if (!getResult.startsWith('threw')) throw new Error(`OBSERVATION CHANGED: get() no longer throws: ${getResult}`);
console.log('\nasserted: TRANSIENT is one instance per CONSUMER. Spring prototype is one');
console.log('          per INJECTION POINT: one consumer asking twice gets 3 and 3 here,');
console.log('          3 and 4 in Spring');
console.log('asserted: get() refuses a transient provider; resolve() is required');
